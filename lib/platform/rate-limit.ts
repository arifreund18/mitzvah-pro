import { loadPlatformStore, savePlatformStore, storageDriver } from './persistence'
import postgres from 'postgres'

export type RateBucket = {
  key: string
  count: number
  windowStart: number
}

const memory = new Map<string, RateBucket>()
let pgClient: ReturnType<typeof postgres> | null = null

function pg() {
  if (!process.env.DATABASE_URL) return null
  if (!pgClient) {
    pgClient = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : 'require',
    })
  }
  return pgClient
}

async function ensureTable() {
  const db = pg()
  if (!db) return
  await db`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INT NOT NULL DEFAULT 0,
      window_start BIGINT NOT NULL
    )
  `
}

/** Sliding fixed window. Returns { ok, remaining }. */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number }> {
  const now = Date.now()
  if (storageDriver() === 'postgres' && process.env.DATABASE_URL) {
    await ensureTable()
    const db = pg()!
    const rows = (await db`
      SELECT count, window_start FROM rate_limits WHERE key = ${key} LIMIT 1
    `) as unknown as { count: number; window_start: string | number }[]
    let count = 0
    let windowStart = now
    if (rows[0]) {
      windowStart = Number(rows[0].window_start)
      count = Number(rows[0].count)
      if (now - windowStart >= windowMs) {
        count = 0
        windowStart = now
      }
    }
    if (count >= limit) {
      return { ok: false, remaining: 0 }
    }
    count += 1
    await db`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (${key}, ${count}, ${windowStart})
      ON CONFLICT (key) DO UPDATE SET count = ${count}, window_start = ${windowStart}
    `
    return { ok: true, remaining: Math.max(0, limit - count) }
  }

  const bucket = memory.get(key)
  if (!bucket || now - bucket.windowStart >= windowMs) {
    memory.set(key, { key, count: 1, windowStart: now })
    return { ok: true, remaining: limit - 1 }
  }
  if (bucket.count >= limit) return { ok: false, remaining: 0 }
  bucket.count += 1
  return { ok: true, remaining: Math.max(0, limit - bucket.count) }
}

/** File-driver fallback also tracks in the JSON store under a reserved key — unused; memory is enough locally. */
export async function pingStoreWritable(): Promise<boolean> {
  try {
    const store = await loadPlatformStore()
    await savePlatformStore(store)
    return true
  } catch {
    return false
  }
}
