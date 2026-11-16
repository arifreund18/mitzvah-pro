import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createStoreReadCache } from '../lib/platform/store-read-cache.ts'

describe('createStoreReadCache', () => {
  const prevTtl = process.env.PLATFORM_STORE_CACHE_TTL_MS

  beforeEach(() => {
    delete process.env.PLATFORM_STORE_CACHE_TTL_MS
  })

  afterEach(() => {
    if (prevTtl === undefined) delete process.env.PLATFORM_STORE_CACHE_TTL_MS
    else process.env.PLATFORM_STORE_CACHE_TTL_MS = prevTtl
  })

  it('loads once within TTL when cache is enabled', async () => {
    const cache = createStoreReadCache<{ n: number }>(60_000)
    let n = 0
    const loader = async () => {
      n += 1
      return { n }
    }
    const a = await cache.get(loader, { cache: true })
    const b = await cache.get(loader, { cache: true })
    assert.deepEqual(a, { n: 1 })
    assert.deepEqual(b, { n: 1 })
    assert.equal(cache.loadCount(), 1)
  })

  it('does not share mutable references across cache hits', async () => {
    const cache = createStoreReadCache<{ items: string[] }>(60_000)
    const first = await cache.get(async () => ({ items: ['a'] }), { cache: true })
    first.items.push('mutated')
    const second = await cache.get(async () => ({ items: ['should-not-run'] }), { cache: true })
    assert.deepEqual(second.items, ['a'])
    assert.equal(cache.loadCount(), 1)
  })

  it('bypasses cache when cache option is false', async () => {
    const cache = createStoreReadCache<{ n: number }>(60_000)
    let n = 0
    const loader = async () => ({ n: ++n })
    await cache.get(loader, { cache: true })
    const fresh = await cache.get(loader, { cache: false })
    assert.deepEqual(fresh, { n: 2 })
    assert.equal(cache.loadCount(), 2)
  })

  it('invalidates so the next cached read reloads', async () => {
    const cache = createStoreReadCache<{ n: number }>(60_000)
    let n = 0
    const loader = async () => ({ n: ++n })
    await cache.get(loader, { cache: true })
    cache.invalidate()
    const next = await cache.get(loader, { cache: true })
    assert.deepEqual(next, { n: 2 })
    assert.equal(cache.loadCount(), 2)
  })

  it('disables cache when PLATFORM_STORE_CACHE_TTL_MS=0', async () => {
    process.env.PLATFORM_STORE_CACHE_TTL_MS = '0'
    const cache = createStoreReadCache<{ n: number }>(60_000)
    let n = 0
    const loader = async () => ({ n: ++n })
    await cache.get(loader, { cache: true })
    await cache.get(loader, { cache: true })
    assert.equal(cache.loadCount(), 2)
  })

  it('coalesces concurrent cache fills into one loader call', async () => {
    const cache = createStoreReadCache<{ n: number }>(60_000)
    let n = 0
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const loader = async () => {
      n += 1
      await gate
      return { n }
    }
    const pending = Promise.all([
      cache.get(loader, { cache: true }),
      cache.get(loader, { cache: true }),
      cache.get(loader, { cache: true }),
    ])
    release()
    const results = await pending
    assert.deepEqual(results, [{ n: 1 }, { n: 1 }, { n: 1 }])
    assert.equal(cache.loadCount(), 1)
  })
})
