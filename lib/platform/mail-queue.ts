import postgres from 'postgres'
import { uid } from './ids'
import { loadPlatformStore, savePlatformStore, storageDriver } from './persistence'
import type { MailJob, MailJobStatus } from './types'
import { MAIL_BATCH_SIZE, mailJobProgress } from './mail-job'

export { MAIL_BATCH_SIZE, mailJobProgress }

let pgClient: ReturnType<typeof postgres> | null = null
let writeChain: Promise<unknown> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn)
  writeChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

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

function usePostgresTable(): boolean {
  return storageDriver() === 'postgres' && Boolean(process.env.DATABASE_URL)
}

async function ensureMailJobsTable() {
  const db = pg()
  if (!db) return
  await db`
    CREATE TABLE IF NOT EXISTS mail_jobs (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
}

type MailJobPayload = {
  guestIds: string[]
  pendingGuestIds: string[]
  processed: number
  succeeded: number
  failed: number
  errors: string[]
  host: string
  from: string
}

function jobFromRow(row: {
  id: string
  event_id: string
  kind: string
  payload: MailJobPayload | string
  status: string
  attempts: number
  last_error: string | null
  created_at: string | Date
  updated_at: string | Date
}): MailJob {
  const payload =
    typeof row.payload === 'string'
      ? (JSON.parse(row.payload) as MailJobPayload)
      : row.payload || ({} as MailJobPayload)
  return {
    id: row.id,
    eventId: row.event_id,
    kind: row.kind === 'std' ? 'std' : 'invite',
    status: (row.status as MailJobStatus) || 'pending',
    guestIds: Array.isArray(payload.guestIds) ? payload.guestIds : [],
    pendingGuestIds: Array.isArray(payload.pendingGuestIds) ? payload.pendingGuestIds : [],
    processed: Number(payload.processed) || 0,
    succeeded: Number(payload.succeeded) || 0,
    failed: Number(payload.failed) || 0,
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    host: payload.host || '',
    from: payload.from || '',
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    attempts: Number(row.attempts) || 0,
    lastError: row.last_error || '',
  }
}

function payloadOf(job: MailJob): MailJobPayload {
  return {
    guestIds: job.guestIds,
    pendingGuestIds: job.pendingGuestIds,
    processed: job.processed,
    succeeded: job.succeeded,
    failed: job.failed,
    errors: job.errors,
    host: job.host,
    from: job.from,
  }
}

export async function createMailJob(input: {
  eventId: string
  kind: 'std' | 'invite'
  guestIds: string[]
  host: string
  from: string
}): Promise<MailJob> {
  const now = new Date().toISOString()
  const job: MailJob = {
    id: uid(),
    eventId: input.eventId,
    kind: input.kind,
    status: 'pending',
    guestIds: [...input.guestIds],
    pendingGuestIds: [...input.guestIds],
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    host: input.host,
    from: input.from,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    lastError: '',
  }

  if (usePostgresTable()) {
    await ensureMailJobsTable()
    const db = pg()!
    await db`
      INSERT INTO mail_jobs (id, event_id, kind, payload, status, attempts, last_error, created_at, updated_at)
      VALUES (
        ${job.id},
        ${job.eventId},
        ${job.kind},
        ${db.json(payloadOf(job) as never)},
        ${job.status},
        ${job.attempts},
        ${job.lastError || null},
        ${job.createdAt},
        ${job.updatedAt}
      )
    `
    return job
  }

  return withLock(async () => {
    const store = await loadPlatformStore()
    if (!store.mailJobs) store.mailJobs = []
    store.mailJobs.push(job)
    await savePlatformStore(store)
    return job
  })
}

export async function getMailJob(jobId: string): Promise<MailJob | null> {
  if (usePostgresTable()) {
    await ensureMailJobsTable()
    const db = pg()!
    const rows = (await db`
      SELECT id, event_id, kind, payload, status, attempts, last_error, created_at, updated_at
      FROM mail_jobs WHERE id = ${jobId} LIMIT 1
    `) as unknown as Parameters<typeof jobFromRow>[0][]
    return rows[0] ? jobFromRow(rows[0]) : null
  }
  const store = await loadPlatformStore()
  return store.mailJobs?.find((job) => job.id === jobId) ?? null
}

export async function getLatestMailJobForEvent(eventId: string): Promise<MailJob | null> {
  if (usePostgresTable()) {
    await ensureMailJobsTable()
    const db = pg()!
    const rows = (await db`
      SELECT id, event_id, kind, payload, status, attempts, last_error, created_at, updated_at
      FROM mail_jobs
      WHERE event_id = ${eventId}
      ORDER BY created_at DESC
      LIMIT 1
    `) as unknown as Parameters<typeof jobFromRow>[0][]
    return rows[0] ? jobFromRow(rows[0]) : null
  }
  const store = await loadPlatformStore()
  const jobs = (store.mailJobs || []).filter((job) => job.eventId === eventId)
  if (!jobs.length) return null
  return [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null
}

export async function saveMailJob(job: MailJob): Promise<MailJob> {
  job.updatedAt = new Date().toISOString()
  if (usePostgresTable()) {
    await ensureMailJobsTable()
    const db = pg()!
    await db`
      UPDATE mail_jobs
      SET
        payload = ${db.json(payloadOf(job) as never)},
        status = ${job.status},
        attempts = ${job.attempts},
        last_error = ${job.lastError || null},
        updated_at = ${job.updatedAt}
      WHERE id = ${job.id}
    `
    return job
  }
  return withLock(async () => {
    const store = await loadPlatformStore()
    if (!store.mailJobs) store.mailJobs = []
    const idx = store.mailJobs.findIndex((item) => item.id === job.id)
    if (idx >= 0) store.mailJobs[idx] = job
    else store.mailJobs.push(job)
    await savePlatformStore(store)
    return job
  })
}

