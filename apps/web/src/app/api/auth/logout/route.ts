export async function POST() {
  const cookie = `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
  })
}
