import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import postgres from 'postgres'
import { list, put } from '@vercel/blob'
import { blobAccessMode, blobReadWriteToken } from './blob-env'
import { createSeedEvent } from './defaults'
import { isProductionEnv } from './auth'
import { DEFAULT_ORG_ID } from './constants'
import { hashPassword } from './password'
import { normalizeEvent } from './normalize'
import { oncePerProcess } from './once'
import {
  loadEventByApprovalToken,
  loadEventByCustomHost,
  loadEventById,
  loadEventByPreviewToken,
  loadEventBySlug,
  loadFamilyByToken,
  loadStoreFromRelational,
  syncStoreToRelational,
  upsertFamilyToRelational,
} from './relational'
import { createStoreReadCache } from './store-read-cache'
import type { Guest, Organization, PlatformEvent, PlatformStore, PlatformUser } from './types'

export type StorageDriver = 'postgres' | 'blob' | 'file'

const LOCAL_PATH = path.join(process.cwd(), 'data', 'platform.json')
const TMP_PATH = path.join('/tmp', 'mitzvah-platform.json')
const BLOB_PATH = 'mitzvah-platform.json'
const PG_ROW_ID = 'default'
/** Default TTL for public read cache (override with PLATFORM_STORE_CACHE_TTL_MS; 0 disables). */
export const PUBLIC_STORE_CACHE_TTL_MS = 10_000

export const EPHEMERAL_STORAGE_ERROR =
  'Persistência efêmera na Vercel: configure DATABASE_URL (Postgres/Neon) ou BLOB_READ_WRITE_TOKEN. Sem isto, eventos criados somem e o wizard responde 404.'

let filePath: string | null = null
let pgClient: ReturnType<typeof postgres> | null = null

const publicStoreCache = createStoreReadCache<PlatformStore>(PUBLIC_STORE_CACHE_TTL_MS)

function defaultOrg(): Organization {
  return { id: DEFAULT_ORG_ID, name: 'Mitzvah', createdAt: new Date().toISOString() }
}

function ownerPassword(): string {
  const value = process.env.PLATFORM_OWNER_PASSWORD
  if (value) return value
  // Never throw during seed/build — production without env gets an unusable random hash.
  if (isProductionEnv()) {
    return `unconfigured-${process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_URL || 'prod'}`
  }
  return 'mitzvah'
}

function seedOwner(): PlatformUser {
  const now = new Date().toISOString()
  return {
    id: 'user-owner',
    email: process.env.PLATFORM_OWNER_EMAIL || 'owner@mitzvah.pro',
    name: 'Org owner',
    passwordHash: hashPassword(ownerPassword()),
    role: 'org_owner',
    orgId: DEFAULT_ORG_ID,
    eventIds: [],
    createdAt: now,
  }
}

function emptyStore(): PlatformStore {
  return {
    orgs: [defaultOrg()],
    users: [seedOwner()],
    events: [createSeedEvent()],
    emailLogs: [],
    mailJobs: [],
  }
}

function normalizeUser(user: PlatformUser): PlatformUser {
  return {
    ...user,
    eventIds: Array.isArray(user.eventIds)
      ? [...new Set(user.eventIds.map((id) => String(id || '').trim()).filter(Boolean))]
      : [],
  }
}

function parseStore(raw: unknown): PlatformStore {
  const parsed = raw as PlatformStore
  if (!parsed || !Array.isArray(parsed.events)) return emptyStore()
  const orgs = Array.isArray(parsed.orgs) && parsed.orgs.length ? parsed.orgs : [defaultOrg()]
  const users = (Array.isArray(parsed.users) && parsed.users.length ? parsed.users : [seedOwner()]).map(
    normalizeUser,
  )
  return {
    orgs,
    users,
    events: parsed.events.map((event) => normalizeEvent(event)),
    emailLogs: Array.isArray(parsed.emailLogs)
      ? parsed.emailLogs.map((log) => {
          const messageId =
            (log as { messageId?: string | null }).messageId ??
            (log as { resendId?: string | null }).resendId ??
            null
          return { ...log, messageId, resendId: messageId }
        })
      : [],
    mailJobs: Array.isArray(parsed.mailJobs) ? parsed.mailJobs : [],
  }
}

export function storageDriver(): StorageDriver {
  if (process.env.DATABASE_URL) return 'postgres'
  if (blobReadWriteToken()) return 'blob'
  return 'file'
}

/** True when running on Vercel without Postgres/Blob — /tmp does not survive across lambdas. */
export function isEphemeralServerStorage(): boolean {
  return storageDriver() === 'file' && Boolean(process.env.VERCEL)
}

export function assertDurableStorage(): void {
  if (isEphemeralServerStorage()) {
    throw new Error(EPHEMERAL_STORAGE_ERROR)
  }
}

function sql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente')
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

const ensurePostgresTable = oncePerProcess(async () => {
  await sql()`
    CREATE TABLE IF NOT EXISTS platform_store (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql()`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INT NOT NULL DEFAULT 0,
      window_start BIGINT NOT NULL
    )
  `
  await sql()`
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      family_id TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      resend_id TEXT,
      to_email TEXT,
      error TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  const { ensureRelationalSchema } = await import('./relational')
  await ensureRelationalSchema(sql())
})

async function loadPostgres(): Promise<PlatformStore> {
  await ensurePostgresTable()
  const db = sql()
  // Prefer relational tables when populated (P0 dual-read).
  try {
    const fromTables = await loadStoreFromRelational(db)
    if (fromTables && fromTables.events.length) return fromTables
  } catch {
    // fall through to JSON blob row
  }
  const rows = (await db`
    SELECT data FROM platform_store WHERE id = ${PG_ROW_ID} LIMIT 1
  `) as unknown as { data: PlatformStore }[]
  if (!rows[0]) {
    const initial = emptyStore()
    await savePostgres(initial)
    return initial
  }
  const store = parseStore(rows[0].data)
  // One-shot migrate JSON → relational when tables empty.
  try {
    await syncStoreToRelational(db, store)
  } catch {
    // non-fatal: JSON remains source of truth until schema settles
  }
  return store
}

async function savePostgres(store: PlatformStore): Promise<void> {
  await ensurePostgresTable()
  const db = sql()
  await db`
    INSERT INTO platform_store (id, data, updated_at)
    VALUES (${PG_ROW_ID}, ${db.json(store as never)}, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `
  // Dual-write operational rows (orgs/users/events/families/logs).
  try {
    await syncStoreToRelational(db, store)
  } catch {
    // JSON write already succeeded; relational sync retried on next save
  }
}

async function loadBlob(): Promise<PlatformStore> {
  const token = blobReadWriteToken()
  const { blobs } = await list({ prefix: BLOB_PATH, token, limit: 10 })
  const match = blobs.find((item) => item.pathname === BLOB_PATH) || blobs[0]
  // Do not write an empty store on miss — list can lag after put and would wipe fresh data.
  if (!match) return emptyStore()
  const res = await fetch(match.url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Blob HTTP ${res.status}`)
  return parseStore(await res.json())
}

async function saveBlob(store: PlatformStore): Promise<void> {
  await put(BLOB_PATH, JSON.stringify(store), {
    access: blobAccessMode(),
    addRandomSuffix: false,
    allowOverwrite: true,
    token: blobReadWriteToken(),
    contentType: 'application/json',
  })
}

async function tryReadFile(file: string): Promise<PlatformStore | null> {
  try {
    const raw = await readFile(file, 'utf8')
    return parseStore(JSON.parse(raw))
  } catch {
    return null
  }
}

async function persistFile(file: string, store: PlatformStore): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(store, null, 2), 'utf8')
}

async function loadFile(): Promise<PlatformStore> {
  if (filePath) return (await tryReadFile(filePath)) ?? emptyStore()
  const local = await tryReadFile(LOCAL_PATH)
  if (local) {
    filePath = LOCAL_PATH
    return local
  }
  const tmp = await tryReadFile(TMP_PATH)
  if (tmp) {
    filePath = TMP_PATH
    return tmp
  }
  const initial = emptyStore()
  try {
    await persistFile(LOCAL_PATH, initial)
    filePath = LOCAL_PATH
  } catch {
    await persistFile(TMP_PATH, initial)
    filePath = TMP_PATH
  }
  return initial
}

async function saveFile(store: PlatformStore): Promise<void> {
  const file = filePath ?? LOCAL_PATH
  try {
    await persistFile(file, store)
    filePath = file
  } catch {
    await persistFile(TMP_PATH, store)
    filePath = TMP_PATH
  }
}

async function loadPlatformStoreUncached(): Promise<PlatformStore> {
  const driver = storageDriver()
  if (driver === 'postgres') return loadPostgres()
  if (driver === 'blob') return loadBlob()
  return loadFile()
}

export type LoadPlatformStoreOptions = {
  /** Use short in-memory cache (public reads only). Invalidated on every save. */
  cache?: boolean
}

export async function loadPlatformStore(
  opts?: LoadPlatformStoreOptions,
): Promise<PlatformStore> {
  return publicStoreCache.get(loadPlatformStoreUncached, { cache: Boolean(opts?.cache) })
}

export function invalidatePlatformStoreCache(): void {
  publicStoreCache.invalidate()
}

/** Test-only: reset public-read cache counters/state. */
export function resetPlatformStoreCacheForTests(): void {
  publicStoreCache.reset()
}

/** Test-only: how many uncached loads ran since last reset. */
export function platformStoreCacheLoadCountForTests(): number {
  return publicStoreCache.loadCount()
}

export async function savePlatformStore(store: PlatformStore): Promise<void> {
  assertDurableStorage()
  try {
    const driver = storageDriver()
    if (driver === 'postgres') {
      await savePostgres(store)
      return
    }
    if (driver === 'blob') {
      await saveBlob(store)
      return
    }
    await saveFile(store)
  } finally {
    // Always drop stale public cache after a write attempt on this instance.
    invalidatePlatformStoreCache()
  }
}

export { eventScopedReadsEnabled } from './feature-flags'

export async function loadScopedEventBySlug(slug: string): Promise<PlatformEvent | null> {
  await ensurePostgresTable()
  return loadEventBySlug(sql(), slug)
}

export async function loadScopedEventById(id: string): Promise<PlatformEvent | null> {
  await ensurePostgresTable()
  return loadEventById(sql(), id)
}

export async function loadScopedEventByCustomHost(host: string): Promise<PlatformEvent | null> {
  await ensurePostgresTable()
  return loadEventByCustomHost(sql(), host)
}

export async function loadScopedEventByPreviewToken(
  token: string,
): Promise<PlatformEvent | null> {
  await ensurePostgresTable()
  return loadEventByPreviewToken(sql(), token)
}

export async function loadScopedEventByApprovalToken(
  token: string,
): Promise<PlatformEvent | null> {
  await ensurePostgresTable()
  return loadEventByApprovalToken(sql(), token)
}

export async function loadScopedFamilyByToken(
  token: string,
): Promise<{ event: PlatformEvent; guest: Guest } | null> {
  await ensurePostgresTable()
  return loadFamilyByToken(sql(), token)
}

/**
 * RSVP / open-tracking write: upsert one family in relational tables and patch
 * the JSON backup row without delete+reinsert of all families.
 */
export async function saveScopedFamilyUpdate(
  eventId: string,
  guest: Guest,
): Promise<void> {
  assertDurableStorage()
  if (storageDriver() !== 'postgres') {
    throw new Error('saveScopedFamilyUpdate requer Postgres')
  }
  await ensurePostgresTable()
  const db = sql()
  await upsertFamilyToRelational(db, eventId, guest)

  const rows = (await db`
    SELECT data FROM platform_store WHERE id = ${PG_ROW_ID} LIMIT 1
  `) as unknown as { data: PlatformStore }[]
  if (rows[0]?.data) {
    const store = parseStore(rows[0].data)
    const event = store.events.find((item) => item.id === eventId)
    if (event) {
      const index = event.guests.findIndex((item) => item.id === guest.id)
      if (index >= 0) event.guests[index] = guest
      else event.guests.push(guest)
      event.updatedAt = new Date().toISOString()
      await db`
        INSERT INTO platform_store (id, data, updated_at)
        VALUES (${PG_ROW_ID}, ${db.json(store as never)}, now())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
      `
    }
  }
  invalidatePlatformStoreCache()
}
