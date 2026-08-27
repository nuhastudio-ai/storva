/**
 * Local SQLite cache for Storva Agent.
 * Stores: offline sync queue, upload state, reconciliation metadata.
 * ponytail: no ORM — only 3 tables, too small to justify Prisma in the agent.
 */
import Database from 'better-sqlite3'
import path from 'node:path'

const DB_PATH = process.env.STORVA_DB_PATH || path.join(process.cwd(), 'data', 'agent.db')

export const db = new Database(DB_PATH, { fileMustExist: false })

db.exec(`
  CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    retries INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS upload_sessions (
    id TEXT PRIMARY KEY,
    relative_path TEXT NOT NULL,
    total_chunks INTEGER NOT NULL,
    received_chunks INTEGER NOT NULL DEFAULT 0,
    checksum TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    completed INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS file_cache (
    relative_path TEXT PRIMARY KEY,
    size INTEGER,
    mime_type TEXT,
    checksum TEXT,
    modified_at INTEGER,
    synced INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0
  );
`)

// Migration: add is_favorite column to file_cache if it doesn't exist yet
// (needed for databases created before this column was added to the schema)
const fileCacheColumns = db.prepare(`PRAGMA table_info(file_cache)`).all() as { name: string }[]
const hasIsFavorite = fileCacheColumns.some((col) => col.name === 'is_favorite')
if (!hasIsFavorite) {
  db.exec(`ALTER TABLE file_cache ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`)
}

// Sync queue helpers
export const syncQueue = {
  push(action: string, payload: object) {
    db.prepare(`INSERT INTO sync_queue (action, payload) VALUES (?, ?)`).run(action, JSON.stringify(payload))
  },
  peek(limit = 10) {
    return db.prepare(`SELECT * FROM sync_queue ORDER BY id ASC LIMIT ?`).all(limit)
  },
  remove(id: number) {
    db.prepare(`DELETE FROM sync_queue WHERE id = ?`).run(id)
  },
  incrementRetry(id: number) {
    db.prepare(`UPDATE sync_queue SET retries = retries + 1 WHERE id = ?`).run(id)
  },
}

// Upload session helpers
export const uploadSessions = {
  create(id: string, relativePath: string, totalChunks: number, checksum?: string) {
    db.prepare(`INSERT INTO upload_sessions (id, relative_path, total_chunks, checksum) VALUES (?, ?, ?, ?)`)
      .run(id, relativePath, totalChunks, checksum || null)
  },
  get(id: string) {
    return db.prepare(`SELECT * FROM upload_sessions WHERE id = ?`).get(id)
  },
  incrementChunk(id: string) {
    db.prepare(`UPDATE upload_sessions SET received_chunks = received_chunks + 1 WHERE id = ?`).run(id)
  },
  complete(id: string) {
    db.prepare(`UPDATE upload_sessions SET completed = 1 WHERE id = ?`).run(id)
  },
  delete(id: string) {
    db.prepare(`DELETE FROM upload_sessions WHERE id = ?`).run(id)
  },
}

// File cache helpers
export const fileCache = {
  upsert(relativePath: string, meta: { size: number; mimeType: string; checksum?: string; modifiedAt: number }) {
    db.prepare(`
      INSERT INTO file_cache (relative_path, size, mime_type, checksum, modified_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(relative_path) DO UPDATE SET
        size = excluded.size, mime_type = excluded.mime_type,
        checksum = excluded.checksum, modified_at = excluded.modified_at, synced = 0
    `).run(relativePath, meta.size, meta.mimeType, meta.checksum || null, meta.modifiedAt)
  },
  markSynced(relativePath: string) {
    db.prepare(`UPDATE file_cache SET synced = 1 WHERE relative_path = ?`).run(relativePath)
  },
  getPending() {
    return db.prepare(`SELECT * FROM file_cache WHERE synced = 0`).all()
  },
  remove(relativePath: string) {
    db.prepare(`DELETE FROM file_cache WHERE relative_path = ?`).run(relativePath)
  },
}

export const favorites = {
  toggle(relativePath: string, isFavorite: boolean) {
    db.prepare(`UPDATE file_cache SET is_favorite = ? WHERE relative_path = ?`).run(isFavorite ? 1 : 0, relativePath)
  },
  list() {
    return db.prepare(`SELECT * FROM file_cache WHERE is_favorite = 1`).all()
  }
}
