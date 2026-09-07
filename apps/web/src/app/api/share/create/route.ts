import { repository } from '@/lib/repository'
import { randomBytes } from 'node:crypto'
import { networkInterfaces } from 'node:os'
import { NextRequest, NextResponse } from 'next/server'

function getBaseUrl(req: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')

  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost || req.headers.get('host') || 'localhost:3000'
  const protocol = req.headers.get('x-forwarded-proto') || 'http'
  if (!/^(localhost|127\.0\.0\.1|::1)(:|$)/.test(host)) return `${protocol}://${host}`

  const port = host.match(/:(\d+)$/)?.[1] || '3000'
  const addresses = Object.values(networkInterfaces()).flat().filter(
    (address): address is NonNullable<typeof address> => Boolean(address) && address.family === 'IPv4' && !address.internal,
  )
  const lanIp = addresses.find((address) => address.address.startsWith('192.168.'))?.address
    || addresses.find((address) => address.address.startsWith('10.'))?.address
    || addresses[0]?.address
  return lanIp ? `http://${lanIp}:${port}` : `http://${host}`
}

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
    await repository.activity.create({
      data: { userId, action: 'share:create', fileId, metadata: JSON.stringify({ fileId, fileName: file?.name || 'unknown' }) },
    })
  } catch {
    // best-effort only
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fileId, relativePath, expiresAt, password, readOnly, accessType } = await req.json()
    if (!fileId && !relativePath) return NextResponse.json({ error: 'fileId or relativePath required' }, { status: 400 })
    if (accessType && !['PUBLIC', 'USER'].includes(accessType)) {
      return NextResponse.json({ error: 'Invalid access type' }, { status: 400 })
    }

    const file = relativePath
      ? await repository.fileMetadata.findFirst({ where: { relativePath } })
      : await repository.fileMetadata.findUnique({ where: { id: fileId } })
    if (!file) return NextResponse.json({ error: 'File metadata not found. Sync storage first.' }, { status: 404 })

    const token = randomBytes(16).toString('hex')
    await repository.shareLink.create({
      data: {
        fileId: file.id,
        token,
        passwordHash: password ? await hashPassword(password) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        readOnly: readOnly ?? true,
        accessType: accessType || 'PUBLIC',
      },
    })

    void recordActivity(await getUserId(req), file.id)
    return NextResponse.json({ success: true, shareUrl: `${getBaseUrl(req)}/s/${token}`, token }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function hashPassword(password: string): Promise<string> {
  // ponytail: use Argon2 before internet-facing deployment.
  return password
}
