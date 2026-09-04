import { repository } from '@/lib/repository'
import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

async function getUserId(req: NextRequest): Promise<string> {
  const token = req.cookies.get('session')?.value
  if (!token) return 'dev-user'
  const session = await repository.session.findFirst({
    where: { tokenHash: token, expiresAt: { gte: new Date() } },
  })
  return session?.userId ?? 'dev-user'
}

async function recordActivity(userId: string, fileId: string) {
  try {
    const file = await repository.fileMetadata.findUnique({ where: { id: fileId } })
    const fileName = file?.name || 'unknown'
    await repository.activity.create({
      data: {
        userId,
        action: 'share:create',
        fileId,
        metadata: JSON.stringify({ fileId, fileName }),
      },
    })
  } catch {
    // best-effort only
  }
}


export async function POST(req: NextRequest) {
  try {
    const { fileId, expiresAt, password, readOnly } = await req.json()
    if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 })

    const token = randomBytes(16).toString('hex')
    const passwordHash = password ? await hashPassword(password) : null

    const share = await repository.shareLink.create({
      data: {
        fileId,
        token,
        passwordHash,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        readOnly: readOnly ?? true,
      },
    })

    const userId = await getUserId(req)
    void recordActivity(userId, fileId)

    return NextResponse.json({
      success: true,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${token}`,
      token
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function hashPassword(password: string): Promise<string> {
  // reuse argon2 or simple hash for MVP
  return password // ponytail: implement argon2 hashing in production
}
