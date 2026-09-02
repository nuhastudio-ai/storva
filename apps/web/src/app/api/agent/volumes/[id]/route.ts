/**
 * /api/agent/volumes/[id]
 * PATCH → toggle enabled / relabel
 * DELETE → remove volume
 */

const AGENT_URL = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const res = await fetch(`${AGENT_URL}/volumes/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: 'Agent offline' }, { status: 503 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${AGENT_URL}/volumes/${params.id}`, { method: 'DELETE' })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: 'Agent offline' }, { status: 503 })
  }
}
