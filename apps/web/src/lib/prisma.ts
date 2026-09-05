import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// ponytail: This is a minimal mock for Prisma to allow development without a real DB.
// In production, this path is never reached because DATABASE_URL is set.
class MockPrismaClient {
  private dbPath = path.join(process.cwd(), 'dev-db.json')
  private data: any = {
    users: [],
    sessions: [],
    devices: [],
    file_metadata: [],
    activities: [],
    upload_sessions: [],
    download_sessions: [],
    share_links: [],
  }

  constructor() {
    if (fs.existsSync(this.dbPath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'))
      } catch (e) {
        console.warn('Failed to load dev-db.json, starting fresh')
      }
    }
  }

  private save() {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2))
  }

  private createModel(modelName: string) {
    return {
      create: async ({ data }: any) => {
        const id = (crypto.randomUUID as () => string)()
        const newItem = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        this.data[modelName].push(newItem)
        this.save()
        return newItem
      },
      findUnique: async ({ where }: any) => {
        return this.data[modelName].find((i: any) => Object.entries(where).every(([k, v]) => i[k] === v)) || null
      },
      findFirst: async ({ where, include }: any) => {
        const item = this.data[modelName].find((i: any) => Object.entries(where || {}).every(([k, v]) => i[k] === v))
        if (!item) return null
        // Simplistic include mock
        if (include) {
          const result: any = { ...item }
          for (const [rel, _] of Object.entries(include)) {
            // This is a very basic mock of relations
            result[rel] = []
          }
          return result
        }
        return item
      },
      findMany: async ({ where, orderBy, take, skip, include }: any) => {
        let items = [...this.data[modelName]]
        if (where) {
          items = items.filter((i: any) => Object.entries(where).every(([k, v]) => i[k] === v))
        }
        if (orderBy) {
          const [key, direction] = Object.entries(orderBy)[0] as [string, string]
          items.sort((a: any, b: any) => {
            const av = new Date(a[key]).getTime()
            const bv = new Date(b[key]).getTime()
            return direction === 'asc' ? av - bv : bv - av
          })
        }
        if (skip) items = items.slice(skip)
        if (take) items = items.slice(0, take)
        if (include) {
          items = items.map((item: any) => {
            const result = { ...item }
            if (include.user && modelName === 'activities') {
              const user = this.data.users.find((u: any) => u.id === item.userId)
              result.user = user ? { username: user.username } : null
            }
            if (include.file && modelName === 'activities') {
              const file = this.data.file_metadata.find((f: any) => f.id === item.fileId)
              result.file = file ? { name: file.name, relativePath: file.relativePath, isFolder: file.isFolder } : null
            }
            return result
          })
        }
        return items
      },
      update: async ({ where, data }: any) => {
        const idx = this.data[modelName].findIndex((i: any) => Object.entries(where).every(([k, v]) => i[k] === v))
        if (idx === -1) throw new Error('Record not found')
        this.data[modelName][idx] = { ...this.data[modelName][idx], ...data, updatedAt: new Date().toISOString() }
        this.save()
        return this.data[modelName][idx]
      },
      count: async () => this.data[modelName].length,
      delete: async ({ where }: any) => {
        const idx = this.data[modelName].findIndex((i: any) => Object.entries(where).every(([k, v]) => i[k] === v))
        if (idx === -1) throw new Error('Record not found')
        const deleted = this.data[modelName].splice(idx, 1)[0]
        this.save()
        return deleted
      }
    }
  }

  get user() { return this.createModel('users') }
  get session() { return this.createModel('sessions') }
  get device() { return this.createModel('devices') }
  get fileMetadata() { return this.createModel('file_metadata') }
  get activity() { return this.createModel('activities') }
  get uploadSession() { return this.createModel('upload_sessions') }
  get downloadSession() { return this.createModel('download_sessions') }
  get shareLink() { return this.createModel('share_links') }
}

const globalForPrisma = globalThis as unknown as { prisma: any }

export const prisma = process.env.DATABASE_URL
  ? (globalForPrisma.prisma ?? new PrismaClient())
  : (globalForPrisma.prisma ?? new MockPrismaClient())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
