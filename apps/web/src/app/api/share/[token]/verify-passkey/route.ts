import { repository } from '@/lib/repository'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const { passkey } = await req.json()
    const share = await repository.shareLink.findUnique({ where: { token } })

    if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!share.passwordHash) {
      return NextResponse.json({ valid: true })
    }

    const valid = share.passwordHash === passkey
    if (!valid) {
      return NextResponse.json({ error: 'Passkey salah' }, { status: 401 })
    }

    return NextResponse.json({ valid: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
