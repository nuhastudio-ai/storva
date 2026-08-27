import { repository } from '../../../../lib/repository'

function getSessionToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)
  return match?.[1] ?? null
}

export async function GET(req: Request) {
  try {
    const rawCookie = req.headers.get('cookie') || ''
    const token = getSessionToken(rawCookie)
    if (!token) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })

    const session = await repository.session.findFirst({
      where: { tokenHash: token, expiresAt: { gte: new Date() } },
      include: { user: true },
    })
    if (!session) return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401 })

    const { passwordHash: _, ...userSafe } = session.user
    return new Response(JSON.stringify({ user: userSafe }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
