import { repository } from '@/lib/repository'
import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

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
