import { repository } from '@/lib/repository'
import { getCurrentUser } from '@/lib/authUtils'
import { signAgentToken } from '@storva/shared-auth'
import { NextRequest, NextResponse } from 'next/server'

// Timeout per request type (ms).
// - LONG: uploads, downloads, chunked transfers — may take minutes
// - SHORT: everything else (list, rename, delete, volumes, stats, health)
const SHORT_TIMEOUT_MS = 8_000
const LONG_TIMEOUT_MS  = 300_000

const LONG_PATHS = new Set(['upload', 'download', 'preview', 'thumbnail', 'files'])

function getTimeout(pathParts: string[]): number {
  const first = pathParts[0] ?? ''
  return LONG_PATHS.has(first) ? LONG_TIMEOUT_MS : SHORT_TIMEOUT_MS
}


function getAllScopes(): Array<'storage:read' | 'storage:write' | 'storage:delete' | 'storage:share'> {
  return ['storage:read', 'storage:write', 'storage:delete', 'storage:share']
}

type Props = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, props: Props)    { return proxy(req, await props.params) }
export async function POST(req: NextRequest, props: Props)   { return proxy(req, await props.params) }
export async function PUT(req: NextRequest, props: Props)    { return proxy(req, await props.params) }
export async function PATCH(req: NextRequest, props: Props)  { return proxy(req, await props.params) }
export async function DELETE(req: NextRequest, props: Props) { return proxy(req, await props.params) }
export async function HEAD(req: NextRequest, props: Props)   { return proxy(req, await props.params) }

async function proxy(req: NextRequest, params: { path: string[] }) {
  try {
    const currentUser = await getCurrentUser(req)
    const userId = currentUser?.id || 'dev-user'
    const token  = await signAgentToken(userId, 'web-proxy', getAllScopes(), 300)

    const agentUrl = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'
    const pathStr  = params.path.length > 0 ? params.path.join('/') : ''
    const url      = new URL(`/${pathStr}`, agentUrl)

    req.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value))

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    }
    if (req.headers.get('content-type')) headers['Content-Type'] = req.headers.get('content-type')!
    if (req.headers.get('range'))        headers['Range']         = req.headers.get('range')!

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    let bodyData: BodyInit | undefined

    if (hasBody) {
      const ab = await req.arrayBuffer()
      if (ab.byteLength > 0) bodyData = Buffer.from(ab)
    }

    // ── Per-request timeout — prevents the proxy hanging forever ─────────────
    const timeoutMs = getTimeout(params.path)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let res: Response
    try {
      res = await fetch(url.toString(), {
        method:  req.method,
        headers,
        body:    bodyData,
        signal:  controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    // ── Record activity on successful mutations ──────────────────────────────
    const mutableActions: Record<string, string> = {
      folder: 'folder:create',
      rename: 'file:rename',
      delete: 'file:delete',
      upload: 'file:upload',
    }
    const actionKey = params.path[0] ?? ''
    const action = mutableActions[actionKey]
    if (action && res.ok && req.method !== 'GET' && req.method !== 'HEAD') {
      // best‑effort logging, never block response
      try {
        // Parse incoming payload (JSON or multipart) for richer metadata
        let meta: any = {}
        let extra: any = {}
        if (bodyData && typeof bodyData !== 'string' && (bodyData as Buffer).length) {
          const contentType = req.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            try { meta = JSON.parse((bodyData as Buffer).toString()) } catch { /* ignore */ }
          } else if (contentType.includes('multipart/form-data')) {
            // Simple regex to extract filenames from multipart payload
            const bodyStr = (bodyData as Buffer).toString('utf8')
            const matches = [...bodyStr.matchAll(/filename="([^\"]+)"/g)]
            const fileNames = matches.map(m => m[1])
            const dirPath = req.nextUrl.searchParams.get('path') || '/' // destination directory
            extra = { dirPath, fileNames }
          }
        }
        // Enrich metadata per action type
        if (actionKey === 'rename') {
          const filePath: string = meta.filePath || ''
          const dirPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/'
          const oldName = filePath.substring(filePath.lastIndexOf('/') + 1)
          extra = { ...extra, dirPath, oldName, newName: meta.newName }
        } else if (actionKey === 'delete') {
          const filePath: string = meta.filePath || ''
          const dirPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/'
          const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
          extra = { ...extra, dirPath, fileName }
        } else if (actionKey === 'folder') {
          // folder creation payload already contains dirPath and folderName
          extra = { ...extra, dirPath: meta.dirPath || '/', folderName: meta.folderName }
        } else if (actionKey === 'upload') {
          // dirPath already captured in extra from multipart handling above
          // If JSON payload (unlikely), fallback to query param
          if (!extra.dirPath) {
            extra.dirPath = req.nextUrl.searchParams.get('path') || '/'
          }
          // fileNames already captured if multipart; if not, leave empty
        }
        await repository.activity.create({
          data: {
            userId,
            action,
            metadata: JSON.stringify({ path: params.path, ...meta, ...extra }),
          },
        })
      } catch { /* swallow */ }
    }

    // ── Record file download ─────────────────────────────────────────────────
    if (actionKey === 'download' && res.ok && req.method === 'GET') {
      try {
        const filePath = req.nextUrl.searchParams.get('path') ?? ''
        await repository.activity.create({
          data: {
            userId,
            action: 'file:download',
            metadata: JSON.stringify({ filePath, path: params.path }),
          },
        })
      } catch { /* swallow */ }
    }

    const response = new NextResponse(res.body, {
      status:     res.status,
      statusText: res.statusText,
    })

    const forwardHeaders = [
      'content-type', 'content-length', 'content-range',
      'accept-ranges', 'content-disposition',
    ]
    forwardHeaders.forEach((h) => {
      const val = res.headers.get(h)
      if (val) response.headers.set(h, val)
    })

    return response
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`Agent proxy timeout: ${req.method} ${req.nextUrl.pathname}`)
      return NextResponse.json({ error: 'Agent timeout — it may still be starting up' }, { status: 504 })
    }
    console.error('Agent proxy error:', err)
    return NextResponse.json({ error: 'Bad Gateway or Agent Offline' }, { status: 502 })
  }
}
