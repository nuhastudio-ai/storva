const AGENT_URL = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'

export async function GET() {
  try {
    const response = await fetch(`${AGENT_URL}/storage/stats`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Agent responded ${response.status}`)
    return Response.json(await response.json())
  } catch {
    return Response.json({ status: 'offline', error: 'Storage unavailable' }, { status: 503 })
  }
}
