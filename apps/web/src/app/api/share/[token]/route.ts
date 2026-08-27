import { repository } from '@/lib/repository'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const share = await repository.shareLink.findUnique({ where: { token: params.token } })
    if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Expired' }, { status: 410 })
    }

    return NextResponse.json({
      id: share.id,
      fileId: share.fileId,
      readOnly: share.readOnly,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
