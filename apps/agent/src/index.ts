import express from 'express'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'
import { resolveSafePath } from '@storva/validation'
import { uploadSessions, syncQueue } from './db'
import { authenticateToken } from './middleware/auth'
import { AGENT_CHANNEL, AGENT_VERSION, getAgentVersionInfo } from './version'

const app = express()
app.use(express.json())

const STORAGE_ROOT = process.env.STORVA_STORAGE_PATH || path.join(process.cwd(), 'storage')
const TRASH_DIR = path.join(STORAGE_ROOT, '.trash')
const PORT = process.env.STORVA_AGENT_PORT || 5125

// Ensure storage dirs exist
fsp.mkdir(STORAGE_ROOT, { recursive: true }).catch(() => {})
fsp.mkdir(TRASH_DIR, { recursive: true }).catch(() => {})

// MIME type lookup (simple)
const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
  '.zip': 'application/zip', '.rar': 'application/x-rar-compressed', '.7z': 'application/x-7z-compressed', '.tar': 'application/x-tar', '.gz': 'application/gzip',
}

function getMimeType(filename: string): string {
  return MIME_MAP[path.extname(filename).toLowerCase()] || 'application/octet-stream'
}

function getCategory(mime: string): string {
  if (mime.startsWith('image/')) return 'images'
  if (mime.startsWith('video/')) return 'videos'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || mime.includes('tar') || mime.includes('gzip')) return 'archives'
  if (mime.startsWith('text/') || mime.includes('pdf') || mime.includes('document') || mime.includes('sheet') || mime.includes('presentation') || mime.includes('msword')) return 'documents'
  return 'others'
}

// Multer for streaming uploads
const diskStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const dir = resolveSafePath(STORAGE_ROOT, (req.query.path as string) || '')
      cb(null, dir)
    } catch (err: any) {
      cb(err, '')
    }
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname)
  },
})
const upload = multer({ storage: diskStorage })

// ---------- ENDPOINTS ----------

// 1. Health + Disk stats
app.get('/health', async (_req, res) => {
  try {
    const stats = await fsp.statfs(STORAGE_ROOT).catch(() => null)
    res.json({
      status: 'online',
      storageRoot: STORAGE_ROOT,
      timestamp: Date.now(),
      version: AGENT_VERSION,
      disk: stats
        ? {
            totalBytes: stats.bsize * stats.blocks,
            freeBytes: stats.bsize * stats.bavail,
            usedBytes: stats.bsize * (stats.blocks - stats.bavail),
          }
        : null,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 1b. Version manifest (for update-notice UI). Public, no sensitive info.
app.get('/version', (_req, res) => {
  res.json(getAgentVersionInfo())
})

// 2. Storage stats by category
app.get('/storage/stats', async (_req, res) => {
  try {
    const fsStats = await fsp.statfs(STORAGE_ROOT).catch(() => null)
    const categories: Record<string, number> = { documents: 0, images: 0, videos: 0, audio: 0, archives: 0, others: 0 }

    async function walk(dir: string) {
      const entries = await fsp.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === '.trash') continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else {
          const st = await fsp.stat(full).catch(() => null)
          if (st) {
            const cat = getCategory(getMimeType(entry.name))
            categories[cat] += st.size
          }
        }
      }
    }
    await walk(STORAGE_ROOT)

    res.json({
      totalBytes: fsStats ? fsStats.bsize * fsStats.blocks : 0,
      freeBytes: fsStats ? fsStats.bsize * fsStats.bavail : 0,
      usedBytes: fsStats ? fsStats.bsize * (fsStats.blocks - fsStats.bavail) : 0,
      percentUsed: fsStats ? Math.round(((fsStats.blocks - fsStats.bavail) / fsStats.blocks) * 10000) / 100 : 0,
      byCategory: categories,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 3. List files/folders
app.get('/files', authenticateToken('read'), async (req, res) => {
  try {
    const subPath = (req.query.path as string) || ''
    const targetDir = resolveSafePath(STORAGE_ROOT, subPath)
    const entries = await fsp.readdir(targetDir, { withFileTypes: true })

    const items = await Promise.all(
      entries
        .filter((e) => e.name !== '.trash' && e.name !== '.staging' && e.name !== '.DS_Store' && !e.name.endsWith('.uploading.tmp'))
        .map(async (entry) => {
          const full = path.join(targetDir, entry.name)
          const st = await fsp.stat(full)
          const mime = entry.isDirectory() ? 'inode/directory' : getMimeType(entry.name)
          const relPath = path.relative(STORAGE_ROOT, full)
          return {
            name: entry.name,
            relativePath: relPath,
            isFolder: entry.isDirectory(),
            size: st.size,
            mimeType: mime,
            category: entry.isDirectory() ? 'folder' : getCategory(mime),
            extension: path.extname(entry.name).replace('.', ''),
            modifiedAt: st.mtime,
            createdAt: st.birthtime,
          }
        })
    )

    res.json({ path: subPath || '/', items })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 4. Create folder
app.post('/folder', authenticateToken('write'), async (req, res) => {
  try {
    const { dirPath, folderName } = req.body
    if (!folderName) return res.status(400).json({ error: 'Folder name required' })
    const target = resolveSafePath(STORAGE_ROOT, path.join(dirPath || '', folderName))
    await fsp.mkdir(target, { recursive: true })
    res.json({ success: true, created: folderName })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 5. Upload (multipart streaming)
app.post('/upload', authenticateToken('write'), upload.array('files'), (req, res) => {
  const uploaded = (req.files as Express.Multer.File[] | undefined) || []
  res.json({
    success: true,
    count: uploaded.length,
    files: uploaded.map((f) => ({ name: f.originalname, size: f.size })),
  })
})

// 6. Download with Range support
app.get('/download', authenticateToken('read'), async (req, res) => {
  try {
    const filePath = req.query.path as string
    if (!filePath) return res.status(400).json({ error: 'Path required' })

    const safeFile = resolveSafePath(STORAGE_ROOT, filePath)
    const stats = await fsp.stat(safeFile)
    if (stats.isDirectory()) return res.status(400).json({ error: 'Cannot download directory' })

    const mime = getMimeType(safeFile)
    const range = req.headers.range

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': mime,
      })
      fs.createReadStream(safeFile, { start, end }).pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${path.basename(safeFile)}"`,
        'Accept-Ranges': 'bytes',
      })
      fs.createReadStream(safeFile).pipe(res)
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 7. Rename
app.post('/rename', authenticateToken('write'), async (req, res) => {
  try {
    const { filePath, newName } = req.body
    if (!filePath || !newName) return res.status(400).json({ error: 'filePath and newName required' })
    const src = resolveSafePath(STORAGE_ROOT, filePath)
    const dest = resolveSafePath(STORAGE_ROOT, path.join(path.dirname(filePath), newName))
    await fsp.rename(src, dest)
    res.json({ success: true, from: path.basename(src), to: newName })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 8. Move
app.post('/move', authenticateToken('write'), async (req, res) => {
  try {
    const { sourcePath, destinationPath } = req.body
    const src = resolveSafePath(STORAGE_ROOT, sourcePath)
    const dest = resolveSafePath(STORAGE_ROOT, destinationPath)
    await fsp.rename(src, dest)
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 9. Copy (recursive for folders)
app.post('/copy', authenticateToken('write'), async (req, res) => {
  try {
    const { sourcePath, destinationPath } = req.body
    const src = resolveSafePath(STORAGE_ROOT, sourcePath)
    const dest = resolveSafePath(STORAGE_ROOT, destinationPath)
    await fsp.cp(src, dest, { recursive: true })
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 10. Soft delete → .trash
app.post('/delete', authenticateToken('delete'), async (req, res) => {
  try {
    const { filePath } = req.body
    if (!filePath) return res.status(400).json({ error: 'filePath required' })
    const safeSource = resolveSafePath(STORAGE_ROOT, filePath)
    const fileName = path.basename(safeSource)
    const trashDest = path.join(TRASH_DIR, `${Date.now()}_${fileName}`)
    await fsp.rename(safeSource, trashDest)
    res.json({ success: true, movedToTrash: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 11. List trash
app.get('/trash', authenticateToken('read'), async (_req, res) => {
  try {
    const entries = await fsp.readdir(TRASH_DIR, { withFileTypes: true })
    const items = await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(TRASH_DIR, entry.name)
        const st = await fsp.stat(full)
        // Name format: timestamp_originalname
        const sep = entry.name.indexOf('_')
        const deletedAt = sep > 0 ? new Date(parseInt(entry.name.substring(0, sep), 10)) : st.mtime
        const originalName = sep > 0 ? entry.name.substring(sep + 1) : entry.name
        return {
          trashName: entry.name,
          originalName,
          isFolder: entry.isDirectory(),
          size: st.size,
          deletedAt,
        }
      })
    )
    res.json({ items })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 12. Restore from trash
app.post('/trash/restore', authenticateToken('write'), async (req, res) => {
  try {
    const { trashName, restorePath } = req.body
    if (!trashName) return res.status(400).json({ error: 'trashName required' })

    const trashFile = path.join(TRASH_DIR, trashName)
    // Verify trashFile is inside TRASH_DIR
    if (!trashFile.startsWith(TRASH_DIR)) return res.status(400).json({ error: 'Invalid trash item' })

    const sep = trashName.indexOf('_')
    const originalName = sep > 0 ? trashName.substring(sep + 1) : trashName
    const dest = resolveSafePath(STORAGE_ROOT, path.join(restorePath || '', originalName))

    await fsp.rename(trashFile, dest)
    res.json({ success: true, restoredTo: dest })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 13. Permanent delete from trash
app.post('/trash/delete', authenticateToken('delete'), async (req, res) => {
  try {
    const { trashName } = req.body
    if (!trashName) return res.status(400).json({ error: 'trashName required' })

    const trashFile = path.join(TRASH_DIR, trashName)
    if (!trashFile.startsWith(TRASH_DIR)) return res.status(400).json({ error: 'Invalid trash item' })

    await fsp.rm(trashFile, { recursive: true, force: true })
    res.json({ success: true, permanentlyDeleted: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 14. Empty trash
app.post('/trash/empty', authenticateToken('delete'), async (_req, res) => {
  try {
    const entries = await fsp.readdir(TRASH_DIR)
    for (const entry of entries) {
      await fsp.rm(path.join(TRASH_DIR, entry), { recursive: true, force: true })
    }
    res.json({ success: true, cleared: entries.length })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 15. File/folder info
app.get('/info', authenticateToken('read'), async (req, res) => {
  try {
    const filePath = req.query.path as string
    if (!filePath) return res.status(400).json({ error: 'Path required' })
    const safe = resolveSafePath(STORAGE_ROOT, filePath)
    const st = await fsp.stat(safe)
    const mime = st.isDirectory() ? 'inode/directory' : getMimeType(safe)

    // Compute SHA-256 for files only
    let checksum: string | null = null
    if (!st.isDirectory() && st.size < 100 * 1024 * 1024) {
      // Only hash files < 100MB inline
      const buf = await fsp.readFile(safe)
      checksum = crypto.createHash('sha256').update(buf).digest('hex')
    }

    res.json({
      name: path.basename(safe),
      relativePath: filePath,
      isFolder: st.isDirectory(),
      size: st.size,
      mimeType: mime,
      category: st.isDirectory() ? 'folder' : getCategory(mime),
      extension: path.extname(safe).replace('.', ''),
      checksum,
      createdAt: st.birthtime,
      modifiedAt: st.mtime,
    })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// 16. Search files
app.get('/search', authenticateToken('read'), async (req, res) => {
  try {
    const query = ((req.query.q as string) || '').toLowerCase()
    if (!query) return res.status(400).json({ error: 'Search query required' })

    const results: any[] = []
    const MAX_RESULTS = 50

    async function walk(dir: string, relDir: string) {
      if (results.length >= MAX_RESULTS) return
      const entries = await fsp.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (results.length >= MAX_RESULTS) return
        if (entry.name === '.trash') continue
        const full = path.join(dir, entry.name)
        const rel = path.join(relDir, entry.name)

        if (entry.name.toLowerCase().includes(query)) {
          const st = await fsp.stat(full)
          results.push({
            name: entry.name,
            relativePath: rel,
            isFolder: entry.isDirectory(),
            size: st.size,
            modifiedAt: st.mtime,
          })
        }
        if (entry.isDirectory()) {
          await walk(full, rel)
        }
      }
    }

    await walk(STORAGE_ROOT, '')
    res.json({ query, results, total: results.length })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})


// Resumable chunk upload: chunks write to .staging, final file appears atomically.
app.post('/upload/session', authenticateToken('write'), async (req, res) => {
  try {
    const { relativePath, totalChunks, checksum } = req.body
    if (!relativePath || !Number.isInteger(totalChunks) || totalChunks < 1) return res.status(400).json({ error: 'Invalid upload session' })
    const id = crypto.randomUUID()
    uploadSessions.create(id, relativePath, totalChunks, checksum)
    await fsp.mkdir(resolveSafePath(STORAGE_ROOT, path.join('.staging', id)), { recursive: true })
    res.status(201).json({ uploadId: id })
  } catch (err: any) { res.status(400).json({ error: err.message }) }
})

app.post('/upload/chunk', authenticateToken('write'), express.raw({ type: 'application/octet-stream', limit: '100mb' }), async (req, res) => {
  try {
    const id = req.query.uploadId as string
    const index = Number(req.query.index)
    const session: any = uploadSessions.get(id)
    if (!session || !Number.isInteger(index) || index < 0 || index >= session.total_chunks) return res.status(400).json({ error: 'Invalid chunk' })
    const chunkPath = resolveSafePath(STORAGE_ROOT, path.join('.staging', id, String(index)))
    await fsp.writeFile(chunkPath, req.body)
    uploadSessions.incrementChunk(id)
    const updated: any = uploadSessions.get(id)
    if (updated.received_chunks >= updated.total_chunks) {
      const finalPath = resolveSafePath(STORAGE_ROOT, updated.relative_path)
      await fsp.mkdir(path.dirname(finalPath), { recursive: true })
      const temp = `${finalPath}.uploading.tmp`
      const out = fs.createWriteStream(temp)
      for (let i = 0; i < updated.total_chunks; i++) await new Promise<void>((resolve, reject) => fs.createReadStream(resolveSafePath(STORAGE_ROOT, path.join('.staging', id, String(i)))).pipe(out, { end: false }).on('finish', resolve).on('error', reject))
      out.end()
      await new Promise<void>((resolve, reject) => out.on('close', resolve).on('error', reject))
      await fsp.rename(temp, finalPath)
      await fsp.rm(resolveSafePath(STORAGE_ROOT, path.join('.staging', id)), { recursive: true, force: true })
      uploadSessions.complete(id)
      syncQueue.push('FILE_UPLOADED', { relativePath: updated.relative_path })
      return res.json({ success: true, completed: true })
    }
    res.json({ success: true, completed: false, received: updated.received_chunks, total: updated.total_chunks })
  } catch (err: any) { res.status(400).json({ error: err.message }) }
})

// Inline preview uses same safe stream and supports Range requests.
app.get('/preview', authenticateToken('read'), async (req, res) => {
  try {
    const safe = resolveSafePath(STORAGE_ROOT, req.query.path as string)
    const stat = await fsp.stat(safe)
    res.type(getMimeType(safe)).set('Accept-Ranges', 'bytes').set('Content-Length', String(stat.size))
    fs.createReadStream(safe).pipe(res)
  } catch (err: any) { res.status(404).json({ error: err.message }) }
})


import sharp from 'sharp'

app.get('/thumbnail', authenticateToken('read'), async (req, res) => {
  try {
    const safe = resolveSafePath(STORAGE_ROOT, req.query.path as string)
    const st = await fsp.stat(safe)
    if (st.isDirectory()) return res.status(400).json({ error: 'Not a file' })
    const buffer = await sharp(safe).resize(200, 200, { fit: 'cover' }).toBuffer()
    res.type('image/jpeg').send(buffer)
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})
import { setupReconciliation } from './reconcile'

const storageRoot = STORAGE_ROOT
const stopReconcile = setupReconciliation(storageRoot)

process.on('SIGINT', () => {
  stopReconcile()
  process.exit()
})

app.listen(PORT, () => {
  console.log(`Storva Agent v${AGENT_VERSION} (${AGENT_CHANNEL})`)
  console.log(`  Port: ${PORT}`)
  console.log(`  Storage: ${STORAGE_ROOT}`)
})

