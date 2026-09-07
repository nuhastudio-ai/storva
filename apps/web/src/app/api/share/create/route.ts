import { repository } from '@/lib/repository'
import { getCurrentUser } from '@/lib/authUtils'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'node:crypto'
import { networkInterfaces } from 'node:os'
import { NextRequest, NextResponse } from 'next/server'

const AGENT_URL = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBaseUrl(req: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')

  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost || req.headers.get('host') || 'localhost:3000'
  const protocol = req.headers.get('x-forwarded-proto') || 'http'
  if (!/^(localhost|127\.0\.0\.1|::1)(:|$)/.test(host)) return `${protocol}://${host}`

  const port = host.match(/:(\d+)$/)?.[1] || '3000'
  const addresses = Object.values(networkInterfaces()).flat().filter(
    (address): address is NonNullable<typeof address> =>
      Boolean(address) && address.family === 'IPv4' && !address.internal,
  )
  const lanIp =
    addresses.find((a) => a.address.startsWith('192.168.'))?.address ||
    addresses.find((a) => a.address.startsWith('10.'))?.address ||
    addresses[0]?.address
  return lanIp ? `http://${lanIp}:${port}` : `http://${host}`
}

/**
 * Get or auto-register the local storage agent as a Device record.
 * Device rows are normally created via the pairing flow; this auto-creates one
 * for local development where pairing has not been performed yet.
 */
async function getOrAutoRegisterDevice(userId: string) {
  const existing = await prisma.device.findFirst({ where: { userId } })
  if (existing) return existing

  let agentVersion = '0.1.0'
  try {
    const res = await fetch(`${AGENT_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3_000),
    })
    if (res.ok) agentVersion = (await res.json()).version ?? agentVersion
  } catch { /* agent offline — use default */ }

  return prisma.device.create({
    data: {
      userId,
      deviceName: 'Local Agent (auto-registered)',
      publicKey: `auto:${userId}`,
      agentVersion,
    },
  })
}

async function recordActivity(userId: string, fileId: string) {
  try {
    const file = await repository.fileMetadata.findUnique({ where: { id: fileId } })
    await repository.activity.create({
      data: {
        userId,
        action: 'share:create',
        fileId,
        metadata: JSON.stringify({ fileId, fileName: file?.name || 'unknown' }),
      },
    })
  } catch { /* best-effort */ }
}

// ── POST /api/share/create ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fileId, relativePath, expiresAt, password, readOnly, accessType, isFolder } = body

    if (!fileId && !relativePath) {
      return NextResponse.json({ error: 'fileId or relativePath required' }, { status: 400 })
    }
    if (accessType && !['PUBLIC', 'USER'].includes(accessType)) {
      return NextResponse.json({ error: 'Invalid access type' }, { status: 400 })
    }

    const currentUser = await getCurrentUser(req)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const device = await getOrAutoRegisterDevice(currentUser.id)

    // Resolve existing FileMetadata or auto-create a minimal record
    let file = relativePath
      ? await repository.fileMetadata.findFirst({ where: { relativePath } })
      : fileId
      ? await repository.fileMetadata.findUnique({ where: { id: fileId } })
      : null

    if (!file && relativePath) {
      const name = relativePath.split('/').filter(Boolean).pop() || relativePath
      const ext = isFolder ? '' : name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
      const mime = isFolder ? 'inode/directory' : 'application/octet-stream'

      file = await repository.fileMetadata.create({
        data: {
          userId: currentUser.id,
          deviceId: device.id,
          name,
          relativePath,
          size: BigInt(0),   // BigInt required by schema; never serialized to JSON below
          mimeType: mime,
          extension: ext,
          isFolder: Boolean(isFolder),
        },
      })
    }

    if (!file) {
      return NextResponse.json({ error: 'File metadata not found.' }, { status: 404 })
    }

    const token = randomBytes(16).toString('hex')
    await prisma.shareLink.create({
      data: {
        fileId: file.id,
        token,
        passwordHash: password ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        readOnly: readOnly ?? true,
        accessType: accessType || 'PUBLIC',
      },
    })

    void recordActivity(currentUser.id, file.id)

    // ⚠️  Never pass Prisma objects (file, shareLink) directly into NextResponse.json —
    // file.size is BigInt and JSON.stringify cannot serialize it.
    // Only return plain scalars here.
    return NextResponse.json(
      { success: true, shareUrl: `${getBaseUrl(req)}/s/${token}`, token },
      { status: 201 },
    )
  } catch (err: any) {
    console.error('[share/create]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
