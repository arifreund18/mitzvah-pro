/**
 * Short in-memory cache for public platform-store reads (same serverless instance).
 * Writes must call invalidate(). Dashboard / auth / mutating paths should load uncached.
 */

export type StoreReadCache<T> = {
  get: (loader: () => Promise<T>, opts?: { cache?: boolean }) => Promise<T>
  invalidate: () => void
  /** Test helper — current entry expiry, or null. */
  peekExpiresAt: () => number | null
  /** Test helper — how many times loader ran. */
  loadCount: () => number
  reset: () => void
}

export function createStoreReadCache<T>(defaultTtlMs: number): StoreReadCache<T> {
  let entry: { value: T; expiresAt: number } | null = null
  let inflight: Promise<T> | null = null
  let loads = 0

  function ttlMs(): number {
    const raw = process.env.PLATFORM_STORE_CACHE_TTL_MS
    if (raw === undefined || raw === '') return defaultTtlMs
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultTtlMs
  }

  return {
    invalidate() {
      entry = null
    },
    peekExpiresAt() {
      return entry?.expiresAt ?? null
    },
    loadCount() {
      return loads
    },
    reset() {
      entry = null
      inflight = null
      loads = 0
    },
    async get(loader, opts) {
      const useCache = Boolean(opts?.cache)
      const ttl = ttlMs()
      if (!useCache || ttl <= 0) {
        loads += 1
        return loader()
      }

      const now = Date.now()
      if (entry && entry.expiresAt > now) {
        return structuredClone(entry.value) as T
      }

      if (!inflight) {
        inflight = (async () => {
          loads += 1
          const value = await loader()
          entry = {
            value: structuredClone(value) as T,
            expiresAt: Date.now() + ttl,
          }
          return value
        })().finally(() => {
          inflight = null
        })
      }

      const value = await inflight
      return structuredClone(value) as T
    },
  }
}
