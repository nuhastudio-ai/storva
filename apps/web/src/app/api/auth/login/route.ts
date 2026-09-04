import { repository } from '../../../../lib/repository'
import { randomBytes } from 'node:crypto'

function setSessionCookie(token: string) {
  const maxAge = 60 * 60 * 24 * 30
  return `session=${token}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''} Max-Age=${maxAge}`
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

    // Find or create admin user in DB
    let user = await repository.user.findFirst({ where: { role: 'ADMIN' } })
    if (!user) {
      // Create default admin user record if not present
      user = await repository.user.create({
        data: {
          email: `${envUsername}@local.storva`,
          name: 'Admin',
          passwordHash: 'ENV_AUTH',
          role: 'ADMIN',
        },
      })
    }

    const token = randomBytes(32).toString('hex')
    await repository.session.create({
      data: {
        userId: user.id,
        tokenHash: token,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    const cookie = setSessionCookie(token)
    return new Response(JSON.stringify({ success: true, user: { id: user.id, username: envUsername, role: 'ADMIN' } }), {
      status: 200,
      headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
