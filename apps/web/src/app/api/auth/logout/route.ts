import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/authUtils'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Delete session cookie (client will clear)
    const cookie = 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
