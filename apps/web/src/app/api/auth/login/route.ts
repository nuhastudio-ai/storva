import { createHmac, randomBytes } from 'node:crypto'

const SECRET = process.env.SIGNING_PRIVATE_KEY || 'super-secret-signing-key-minimum-32-chars-long'

function signToken(payload: string): string {
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Missing username or password' }), { status: 400 })
    }

    const envUsername = process.env.ADMIN_USERNAME || 'admin'
    const envPassword = process.env.ADMIN_PASSWORD || 'password'

    if (username !== envUsername || password !== envPassword) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401 })
    }

    // Create a signed token: "admin:<random>.<hmac>"
    const nonce = randomBytes(16).toString('hex')
    const payload = `${envUsername}:${nonce}`
    const token = signToken(payload)

    const maxAge = 60 * 60 * 24 * 30 // 30 days
    const cookie = `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`

    return new Response(
      JSON.stringify({ success: true, user: { username: envUsername, role: 'ADMIN' } }),
      { status: 200, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
