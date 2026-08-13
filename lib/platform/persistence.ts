import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import postgres from 'postgres'
import { list, put } from '@vercel/blob'
import { createSeedEvent } from './defaults'
import { normalizeEvent } from './normalize'
import type { PlatformStore } from './types'

export type StorageDriver = 'postgres' | 'blob' | 'file'

const LOCAL_PATH = path.join(process.cwd(), 'data', 'platform.json')
const TMP_PATH = path.join('/tmp', 'mitzvah-platform.json')
const BLOB_PATH = 'mitzvah-platform.json'
const PG_ROW_ID = 'default'

let filePath: string | null = null
let pgClient: ReturnType<typeof postgres> | null = null

function emptyStore(): PlatformStore {
  return { events: [createSeedEvent()] }
}

function parseStore(raw: unknown): PlatformStore {
  const parsed = raw as PlatformStore
  if (!parsed || !Array.isArray(parsed.events)) return emptyStore()
  return { events: parsed.events.map((event) => normalizeEvent(event)) }
}

export function storageDriver(): StorageDriver {
  if (process.env.DATABASE_URL) return 'postgres'
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob'
  return 'file'
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

async function ensurePostgresTable() {
  await sql()`
    CREATE TABLE IF NOT EXISTS platform_store (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
}

async function loadPostgres(): Promise<PlatformStore> {
  await ensurePostgresTable()
  const db = sql()
  const rows = (await db`
    SELECT data FROM platform_store WHERE id = ${PG_ROW_ID} LIMIT 1
  `) as unknown as { data: PlatformStore }[]
  if (!rows[0]) {
    const initial = emptyStore()
    await savePostgres(initial)
    return initial
  }
  return parseStore(rows[0].data)
}

async function savePostgres(store: PlatformStore): Promise<void> {
  await ensurePostgresTable()
  const db = sql()
  await db`
    INSERT INTO platform_store (id, data, updated_at)
    VALUES (${PG_ROW_ID}, ${db.json(store as never)}, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `
}

async function loadBlob(): Promise<PlatformStore> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const { blobs } = await list({ prefix: BLOB_PATH, token, limit: 10 })
  const match = blobs.find((item) => item.pathname === BLOB_PATH) || blobs[0]
  if (!match) {
    const initial = emptyStore()
    await saveBlob(initial)
    return initial
  }
  const res = await fetch(match.url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Blob HTTP ${res.status}`)
  return parseStore(await res.json())
}

async function saveBlob(store: PlatformStore): Promise<void> {
  await put(BLOB_PATH, JSON.stringify(store), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
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

export async function loadPlatformStore(): Promise<PlatformStore> {
  const driver = storageDriver()
  if (driver === 'postgres') return loadPostgres()
  if (driver === 'blob') return loadBlob()
  return loadFile()
}

export async function savePlatformStore(store: PlatformStore): Promise<void> {
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
}
