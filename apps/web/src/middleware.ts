import { NextResponse, NextRequest } from 'next/server'
import { repository } from './lib/repository'

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 10

// In-memory store (dev-only). Replace with Redis/DB in production multi-instance.
const store = new Map<string, { count: number; resetAt: number }>()

function rateLimit(key: string): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false // allowed
  }
  entry.count++
  if (entry.count > RATE_LIMIT_MAX) return true // blocked
  return false
}

const SENSITIVE_PATHS = ['/api/auth/login', '/api/auth/register', '/api/pairing']

export async function middleware(req: NextRequest) {
  // Rate limiting on sensitive endpoints
  if (SENSITIVE_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown'
    const key = `${req.nextUrl.pathname}:${ip}`
    if (rateLimit(key)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }
  }

  // Auth middleware for write operations on all API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const isWriteMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    if (isWriteMethod) {
      const token = req.headers.get('cookie')?.match(/(?:^|;\\s*)session=([^;]+)/)?.[1] ?? null
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const session = await repository.session.findFirst({
        where: { tokenHash: token, expiresAt: { gte: new Date() } },
      })
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // Session is valid, allow the request
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
