/**
 * /api/agent/volumes
 * Proxy to agent /volumes endpoint.
 * GET  → list all volumes
 * POST → add new volume
 */

const AGENT_URL = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'

export async function GET() {
  try {
    const res = await fetch(`${AGENT_URL}/volumes`, { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: 'Agent offline' }, { status: 503 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await fetch(`${AGENT_URL}/volumes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: 'Agent offline' }, { status: 503 })
  }
}
