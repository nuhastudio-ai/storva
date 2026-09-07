import { repository } from '@/lib/repository'
import { NextRequest, NextResponse } from 'next/server'

function getCategory(file: any) {
  if (file.isFolder) return 'folder'
  const mime = file.mimeType || ''
  if (mime.startsWith('image/')) return 'images'
  if (mime.startsWith('video/')) return 'videos'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('text/') || mime.includes('pdf') || mime.includes('document') || mime.includes('sheet') || mime.includes('presentation') || mime.includes('msword')) return 'documents'
  return 'others'
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const share = await repository.shareLink.findUnique({ where: { token } })
    if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Expired' }, { status: 410 })
    }

    const file = await repository.fileMetadata.findUnique({ where: { id: share.fileId } })
    if (!file) return NextResponse.json({ error: 'Shared file not found' }, { status: 404 })

    return NextResponse.json({
      id: share.id,
      fileId: share.fileId,
      name: file.name,
      isFolder: file.isFolder,
      relativePath: file.relativePath,
      mimeType: file.mimeType,
      category: getCategory(file),
      size: file.size.toString(),
      accessType: share.accessType,
      hasPasskey: Boolean(share.passwordHash),
      readOnly: share.readOnly,
      volumeId: share.volumeId ?? null,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
