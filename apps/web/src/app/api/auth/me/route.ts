import { createHmac } from 'node:crypto'

const SECRET = process.env.SIGNING_PRIVATE_KEY || 'super-secret-signing-key-minimum-32-chars-long'

function verifyToken(token: string): boolean {
  const lastDot = token.lastIndexOf('.')
  if (lastDot === -1) return false
  const payload = token.slice(0, lastDot)
  const sig = token.slice(lastDot + 1)
  const expectedSig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return sig === expectedSig
}

function getSessionToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)
  return match?.[1] ?? null
}

export async function GET(req: Request) {
  try {
    const rawCookie = req.headers.get('cookie') || ''
    const token = getSessionToken(rawCookie)
    if (!token || !verifyToken(token)) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    const envUsername = process.env.ADMIN_USERNAME || 'admin'
    return new Response(
      JSON.stringify({ user: { username: envUsername, role: 'ADMIN' } }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
