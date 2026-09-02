import chokidar from 'chokidar'
import path from 'node:path'
import { syncQueue, fileCache } from './db'

export function setupReconciliation(storageRoot: string) {
  // Folders that are always EPERM-protected on Windows drive roots.
  // Chokidar will throw unwatchable-path errors for these even as Administrator.
  const WINDOWS_SYSTEM_DIRS_PATTERN =
    /[\/\\](System Volume Information|\$Recycle\.Bin|\$RECYCLE\.BIN|Recovery|\$WinREAgent|Config\.Msi|MSOCache|PerfLogs)([\/\\]|$)/

  const watcher = chokidar.watch(storageRoot, {
    ignored: [
      /(^|[\/\\])\./,              // dotfiles / hidden
      /\.trash([\/\\]|$)/,         // .trash dir
      /\.staging([\/\\]|$)/,       // .staging dir
      /\.uploading\.tmp$/,         // temp upload files
      WINDOWS_SYSTEM_DIRS_PATTERN, // Windows system-protected folders
    ],
    persistent: true,
    // TRUE: skip emitting 'add'/'addDir' for every pre-existing file on startup.
    // FALSE here was the root cause of the reconciler loop — on a drive root like D:\
    // it would scan thousands of existing files, flood the sync_queue, and keep
    // retrying forever because the cloud URL is unreachable in a local-only setup.
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  })

  // Debounce maps to prevent flooding the database/queue
  const pendingQueue = new Map<string, { action: string; relativePath: string; timer: NodeJS.Timeout }>()

  function queueEvent(action: string, fullPath: string) {
    const relativePath = path.relative(storageRoot, fullPath)
    if (!relativePath || relativePath.startsWith('..')) return

    if (pendingQueue.has(relativePath)) {
      clearTimeout(pendingQueue.get(relativePath)!.timer)
    }

    const timer = setTimeout(() => {
      pendingQueue.delete(relativePath)
      syncQueue.push(action, { relativePath, timestamp: Date.now() })
      console.log(`[Reconciler:${path.basename(storageRoot)}] ${action} → ${relativePath}`)
    }, 500)

    pendingQueue.set(relativePath, { action, relativePath, timer })
  }

  watcher
    .on('add', (filePath) => queueEvent('FILE_CREATED', filePath))
    .on('change', (filePath) => queueEvent('FILE_MODIFIED', filePath))
    .on('unlink', (filePath) => queueEvent('FILE_DELETED', filePath))
    .on('addDir', (dirPath) => queueEvent('DIR_CREATED', dirPath))
    .on('unlinkDir', (dirPath) => queueEvent('DIR_DELETED', dirPath))
    .on('error', (err) => {
      // Without this handler, an unwatchable path throws an unhandled EventEmitter
      // error and kills the whole agent process.
      console.error(`[Reconciler:${path.basename(storageRoot)}] Watcher error:`, err)
    })

  console.log(`[Reconciler] Watching: ${storageRoot}`)

  // Max retries before an item is considered undeliverable and dropped.
  // Without this cap, items accumulate forever when the cloud is offline.
  const MAX_RETRIES = 5

  // Background flusher: sync queued changes to cloud control plane.
  // Only runs when STORVA_CLOUD_URL is explicitly set — if it's not configured
  // the cloud is intentionally absent (local-only mode) and we skip silently.
  const syncInterval = setInterval(async () => {
    const cloudUrl = process.env.STORVA_CLOUD_URL
    if (!cloudUrl) return // local-only mode — no cloud to sync to

    const items: any[] = syncQueue.peek(10)
    if (items.length === 0) return

    for (const item of items) {
      // Drop items that have exceeded max retries to prevent infinite loops
      if (item.retries >= MAX_RETRIES) {
        console.warn(`[Reconciler:${path.basename(storageRoot)}] Dropping undeliverable event id=${item.id} (${item.retries} retries): ${item.payload}`)
        syncQueue.remove(item.id)
        continue
      }

      try {
        const payload = JSON.parse(item.payload)
        const res = await fetch(`${cloudUrl}/api/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            userId: process.env.STORVA_DEV_USER_ID || 'dev-user',
            action: item.action,
            metadata: JSON.stringify(payload),
          }),
        })
        if (res.ok) {
          syncQueue.remove(item.id)
        } else {
          syncQueue.incrementRetry(item.id)
        }
      } catch {
        // Cloud unreachable — increment retry and stop this batch
        syncQueue.incrementRetry(item.id)
        break
      }
    }
  }, 10000)

  return () => {
    watcher.close()
    clearInterval(syncInterval)
  }
}
