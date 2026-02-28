/**
 * Simple in-memory rate limit per key (e.g. IP or IP+slug).
 * Resets on server restart; for serverless, consider Vercel KV or Upstash.
 */
const store = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60 * 1000

export function rateLimit(key: string, limit: number): { ok: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: limit - 1 }
  }
  if (now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: limit - 1 }
  }
  entry.count++
  if (entry.count > limit) {
    return { ok: false, remaining: 0 }
  }
  return { ok: true, remaining: limit - entry.count }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return ip
}
