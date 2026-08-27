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

// Map HTTP method to default scope (can be overridden by query ?scope=)
// For simplicity, we grant all scopes; agent middleware will enforce per-endpoint.
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
    const userId = await getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Sign token with all scopes (agent will check specific scope)
    const token = await signAgentToken(userId, 'web-proxy', getAllScopes(), 300) // 5 min TTL

    // Build target URL
    const agentUrl = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'
    const path = params.path.length > 0 ? params.path.join('/') : ''
    const url = new URL(`/${path}`, agentUrl)
    // Copy query parameters
    req.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value))

    // Forward request
    const res = await fetch(url.toString(), {
      method: req.method,
      headers: {
        Authorization: `Bearer ${token}`,
        // Forward content-type if present
        ...(req.headers.get('content-type') && { 'Content-Type': req.headers.get('content-type')! }),
      },
      body: req.body,
      // Disable automatic decompression; agent may send compressed? Not needed.
    })

    // Copy status and headers
    const response = new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
    })
    res.headers.forEach((value, key) => {
      // Avoid overwriting Next.js specific headers
      if (!key.startsWith('x-nextjs-')) {
        response.headers.set(key, value)
      }
    })
    return response
  } catch (err: any) {
    console.error('Agent proxy error:', err)
    return NextResponse.json({ error: 'Bad Gateway' }, { status: 502 })
  }
}
