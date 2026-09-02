import { repository } from '@/lib/repository'
import { signAgentToken } from '@storva/shared-auth'
import { NextRequest, NextResponse } from 'next/server'

// Helper to get userId from session cookie
async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('session')?.value
  if (!token) return null

  const session = await repository.session.findFirst({
    where: { tokenHash: token, expiresAt: { gte: new Date() } },
  })
  return session?.userId ?? null
}

function getAllScopes(): Array<'storage:read' | 'storage:write' | 'storage:delete' | 'storage:share'> {
  return ['storage:read', 'storage:write', 'storage:delete', 'storage:share']
}

type Props = {
  params: Promise<{ path: string[] }>
}

export async function GET(req: NextRequest, props: Props) {
  return proxy(req, await props.params)
}
export async function POST(req: NextRequest, props: Props) {
  return proxy(req, await props.params)
}
export async function PUT(req: NextRequest, props: Props) {
  return proxy(req, await props.params)
}
export async function PATCH(req: NextRequest, props: Props) {
  return proxy(req, await props.params)
}
export async function DELETE(req: NextRequest, props: Props) {
  return proxy(req, await props.params)
}
export async function HEAD(req: NextRequest, props: Props) {
  return proxy(req, await props.params)
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  try {
    const userId = (await getUserId(req)) || 'dev-user'

    // Sign token with all scopes (agent will check specific scope)
    const token = await signAgentToken(userId, 'web-proxy', getAllScopes(), 300) // 5 min TTL

    // Build target URL
    const agentUrl = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'
    const path = params.path.length > 0 ? params.path.join('/') : ''
    const url = new URL(`/${path}`, agentUrl)
    // Copy query parameters
    req.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value))

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    }

    if (req.headers.get('content-type')) {
      headers['Content-Type'] = req.headers.get('content-type')!
    }
    if (req.headers.get('range')) {
      headers['Range'] = req.headers.get('range')!
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    let bodyData: BodyInit | undefined = undefined

    if (hasBody) {
      const arrayBuffer = await req.arrayBuffer()
      if (arrayBuffer.byteLength > 0) {
        bodyData = Buffer.from(arrayBuffer)
      }
    }

    // Forward request to Agent
    const res = await fetch(url.toString(), {
      method: req.method,
      headers,
      body: bodyData,
    })

    // Create response
    const response = new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
    })

    // Forward important headers
    const forwardHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'content-disposition',
    ]

    forwardHeaders.forEach((header) => {
      const val = res.headers.get(header)
      if (val) response.headers.set(header, val)
    })

    return response
  } catch (err: any) {
    console.error('Agent proxy error:', err)
    return NextResponse.json({ error: 'Bad Gateway or Agent Offline' }, { status: 502 })
  }
}
