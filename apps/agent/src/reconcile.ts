import chokidar from 'chokidar'
import path from 'node:path'
import { syncQueue, fileCache } from './db'

export function setupReconciliation(storageRoot: string) {
  const watcher = chokidar.watch(storageRoot, {
    ignored: /(^|[\/\\])\..|^\.trash|\.staging|\.uploading\.tmp$/, // ignore dotfiles, .trash, .staging, temp files
    persistent: true,
    ignoreInitial: false,
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

    // Cancel prior pending debounced event for this path
    if (pendingQueue.has(relativePath)) {
      clearTimeout(pendingQueue.get(relativePath)!.timer)
    }

    const timer = setTimeout(() => {
      pendingQueue.delete(relativePath)
      // Push event into SQLite sync_queue for offline sync
      syncQueue.push(action, { relativePath, timestamp: Date.now() })
      console.log(`[Reconciler] Enqueued event: ${action} on ${relativePath}`)
    }, 500) // 500ms debounce

    pendingQueue.set(relativePath, { action, relativePath, timer })
  }

  watcher
    .on('add', (filePath) => queueEvent('FILE_CREATED', filePath))
    .on('change', (filePath) => queueEvent('FILE_MODIFIED', filePath))
    .on('unlink', (filePath) => queueEvent('FILE_DELETED', filePath))
    .on('addDir', (dirPath) => queueEvent('DIR_CREATED', dirPath))
    .on('unlinkDir', (dirPath) => queueEvent('DIR_DELETED', dirPath))

  console.log(`[Reconciler] Watching directory: ${storageRoot}`)

  // Background flusher job to attempt syncing queued changes to cloud control plane
  const syncInterval = setInterval(async () => {
    const items: any[] = syncQueue.peek(10)
    if (items.length === 0) return

    const cloudUrl = process.env.STORVA_CLOUD_URL || 'http://localhost:3000'
    for (const item of items) {
      try {
        const payload = JSON.parse(item.payload)
        const res = await fetch(`${cloudUrl}/api/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      } catch (err) {
        // Offline or cloud unreachable, keep in queue
        syncQueue.incrementRetry(item.id)
        break // Stop processing this batch if offline
      }
    }
  }, 10000) // Every 10 seconds

  return () => {
    watcher.close()
    clearInterval(syncInterval)
  }
}
