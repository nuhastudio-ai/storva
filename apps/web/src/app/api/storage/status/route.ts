/**
 * /api/storage/status
 * Proxies to agent /storage/stats.
 * Accepts optional ?vol=<volumeId> — forwarded to agent.
 * Falls back to first active volume if omitted.
 */

const AGENT_URL = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const vol = searchParams.get('vol')
  const url = vol
    ? `${AGENT_URL}/storage/stats?vol=${encodeURIComponent(vol)}`
    : `${AGENT_URL}/storage/stats`

  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Agent responded ${response.status}`)
    return Response.json(await response.json())
  } catch {
    return Response.json({ status: 'offline', error: 'Storage unavailable' }, { status: 503 })
  }
}
