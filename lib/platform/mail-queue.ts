import postgres from 'postgres'
import { uid } from './ids'
import { oncePerProcess } from './once'
import { loadPlatformStore, savePlatformStore, storageDriver } from './persistence'
import type { MailJob, MailJobStatus } from './types'
import {
  MAIL_BATCH_SIZE,
  MAIL_JOB_IN_FLIGHT_LEASE_MS,
  applyClaimMailJobBatch,
  applyRecordMailJobBatchResult,
  mailJobProgress,
  type MailJobBatchResultInput,
} from './mail-job'

export {
  MAIL_BATCH_SIZE,
  MAIL_JOB_IN_FLIGHT_LEASE_MS,
  mailJobProgress,
  applyClaimMailJobBatch,
  applyRecordMailJobBatchResult,
}
export type { MailJobBatchResultInput }

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

const ensureMailJobsTable = oncePerProcess(async () => {
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
})

type MailJobPayload = {
  guestIds: string[]
  pendingGuestIds: string[]
  deferredGuestIds?: string[]
  inFlightGuestIds?: string[]
  processed: number
  succeeded: number
  failed: number
  deferred?: number
  errors: string[]
  host: string
  from: string
  configurationSetName?: string
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
    deferredGuestIds: Array.isArray(payload.deferredGuestIds) ? payload.deferredGuestIds : [],
    inFlightGuestIds: Array.isArray(payload.inFlightGuestIds) ? payload.inFlightGuestIds : [],
    processed: Number(payload.processed) || 0,
    succeeded: Number(payload.succeeded) || 0,
    failed: Number(payload.failed) || 0,
    deferred: Number(payload.deferred) || 0,
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    host: payload.host || '',
    from: payload.from || '',
    configurationSetName: payload.configurationSetName || '',
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
    deferredGuestIds: job.deferredGuestIds || [],
    inFlightGuestIds: job.inFlightGuestIds || [],
    processed: job.processed,
    succeeded: job.succeeded,
    failed: job.failed,
    deferred: job.deferred || 0,
    errors: job.errors,
    host: job.host,
    from: job.from,
    configurationSetName: job.configurationSetName || '',
  }
}

function buildMailJob(input: {
  eventId: string
  kind: 'std' | 'invite'
  guestIds: string[]
  host: string
  from: string
  configurationSetName?: string
}): MailJob {
  const now = new Date().toISOString()
  return {
    id: uid(),
    eventId: input.eventId,
    kind: input.kind,
    status: 'pending',
    guestIds: [...input.guestIds],
    pendingGuestIds: [...input.guestIds],
    deferredGuestIds: [],
    inFlightGuestIds: [],
    processed: 0,
    succeeded: 0,
    failed: 0,
    deferred: 0,
    errors: [],
    host: input.host,
    from: input.from,
    configurationSetName: input.configurationSetName || '',
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    lastError: '',
  }
}

function jobHasRemainingWork(job: MailJob): boolean {
  return (
    job.pendingGuestIds.length +
      (job.inFlightGuestIds?.length || 0) +
      (job.deferredGuestIds?.length || 0) >
      0 || job.status === 'processing'
  )
}

export async function createMailJob(input: {
  eventId: string
  kind: 'std' | 'invite'
  guestIds: string[]
  host: string
  from: string
  configurationSetName?: string
}): Promise<MailJob> {
  const job = buildMailJob(input)

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

/**
 * Create a job only if no active job exists for the same event+kind.
 * Prevents double-click / two-tab from opening parallel queues.
 */
export async function createMailJobExclusive(input: {
  eventId: string
  kind: 'std' | 'invite'
  guestIds: string[]
  host: string
  from: string
  configurationSetName?: string
}): Promise<{ job: MailJob; created: true } | { job: MailJob; created: false }> {
  if (usePostgresTable()) {
    await ensureMailJobsTable()
    const db = pg()!
    return db.begin(async (tx) => {
      const rows = (await tx`
        SELECT id, event_id, kind, payload, status, attempts, last_error, created_at, updated_at
        FROM mail_jobs
        WHERE event_id = ${input.eventId}
          AND kind = ${input.kind}
          AND status IN ('pending', 'processing')
        ORDER BY created_at DESC
        LIMIT 20
        FOR UPDATE
      `) as unknown as Parameters<typeof jobFromRow>[0][]
      for (const row of rows) {
        const existing = jobFromRow(row)
        if (jobHasRemainingWork(existing)) {
          return { job: existing, created: false as const }
        }
      }
      const job = buildMailJob(input)
      await tx`
        INSERT INTO mail_jobs (id, event_id, kind, payload, status, attempts, last_error, created_at, updated_at)
        VALUES (
          ${job.id},
          ${job.eventId},
          ${job.kind},
          ${tx.json(payloadOf(job) as never)},
          ${job.status},
          ${job.attempts},
          ${job.lastError || null},
          ${job.createdAt},
          ${job.updatedAt}
        )
      `
      return { job, created: true as const }
    })
  }

  return withLock(async () => {
    const store = await loadPlatformStore()
    if (!store.mailJobs) store.mailJobs = []
    const active = store.mailJobs
      .filter(
        (item) =>
          item.eventId === input.eventId &&
          item.kind === input.kind &&
          (item.status === 'pending' || item.status === 'processing'),
      )
      .find(jobHasRemainingWork)
    if (active) return { job: active, created: false as const }
    const job = buildMailJob(input)
    store.mailJobs.push(job)
    await savePlatformStore(store)
    return { job, created: true as const }
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

/** Active = still has work (pending/processing). Blocks creating a second bulk job. */
export async function getActiveMailJobForEvent(
  eventId: string,
  kind?: 'std' | 'invite',
): Promise<MailJob | null> {
  if (usePostgresTable()) {
    await ensureMailJobsTable()
    const db = pg()!
    const rows = (
      kind
        ? await db`
            SELECT id, event_id, kind, payload, status, attempts, last_error, created_at, updated_at
            FROM mail_jobs
            WHERE event_id = ${eventId}
              AND kind = ${kind}
              AND status IN ('pending', 'processing')
            ORDER BY created_at DESC
            LIMIT 20
          `
        : await db`
            SELECT id, event_id, kind, payload, status, attempts, last_error, created_at, updated_at
            FROM mail_jobs
            WHERE event_id = ${eventId}
              AND status IN ('pending', 'processing')
            ORDER BY created_at DESC
            LIMIT 20
          `
    ) as unknown as Parameters<typeof jobFromRow>[0][]
    for (const row of rows) {
      const job = jobFromRow(row)
      const remaining =
        job.pendingGuestIds.length +
        (job.inFlightGuestIds?.length || 0) +
        (job.deferredGuestIds?.length || 0)
      if (remaining > 0 || job.status === 'processing') return job
    }
    return null
  }
  const store = await loadPlatformStore()
  const jobs = (store.mailJobs || [])
    .filter((job) => job.eventId === eventId && (!kind || job.kind === kind))
    .filter((job) => job.status === 'pending' || job.status === 'processing')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  for (const job of jobs) {
    const remaining =
      job.pendingGuestIds.length +
      (job.inFlightGuestIds?.length || 0) +
      (job.deferredGuestIds?.length || 0)
    if (remaining > 0 || job.status === 'processing') return job
  }
  return null
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

/** Stop a queued/processing job — clears pending/in-flight so workers cannot resume. */
export async function cancelMailJob(
  jobId: string,
  reason: string = 'cancelled',
): Promise<MailJob | null> {
  const job = await getMailJob(jobId)
  if (!job) return null
  if (job.status === 'completed' || job.status === 'failed') return job
  job.pendingGuestIds = []
  job.inFlightGuestIds = []
  job.deferredGuestIds = []
  job.deferred = 0
  job.status = 'failed'
  job.lastError = reason
  job.errors.push(reason)
  return saveMailJob(job)
}

/**
 * Atomically take the next batch out of `pendingGuestIds` and persist before send.
 * Concurrent workers get disjoint batches — prevents duplicate SES sends (Adissi flood).
 */
export async function claimMailJobBatch(
  jobId: string,
  batchSize: number = MAIL_BATCH_SIZE,
  nowMs: number = Date.now(),
): Promise<{ job: MailJob; batch: string[] } | null> {
  if (usePostgresTable()) {
    await ensureMailJobsTable()
    const db = pg()!
    return db.begin(async (tx) => {
      const rows = (await tx`
        SELECT id, event_id, kind, payload, status, attempts, last_error, created_at, updated_at
        FROM mail_jobs WHERE id = ${jobId} LIMIT 1 FOR UPDATE
      `) as unknown as Parameters<typeof jobFromRow>[0][]
      if (!rows[0]) return null
      const result = applyClaimMailJobBatch(jobFromRow(rows[0]), batchSize, nowMs)
      await tx`
        UPDATE mail_jobs
        SET
          payload = ${tx.json(payloadOf(result.job) as never)},
          status = ${result.job.status},
          attempts = ${result.job.attempts},
          last_error = ${result.job.lastError || null},
          updated_at = ${result.job.updatedAt}
        WHERE id = ${result.job.id}
      `
      return result
    })
  }

  return withLock(async () => {
    const store = await loadPlatformStore()
    const job = store.mailJobs?.find((item) => item.id === jobId)
    if (!job) return null
    const result = applyClaimMailJobBatch(job, batchSize, nowMs)
    if (!store.mailJobs) store.mailJobs = []
    const idx = store.mailJobs.findIndex((item) => item.id === jobId)
    if (idx >= 0) store.mailJobs[idx] = result.job
    await savePlatformStore(store)
    return result
  })
}

export type MailJobBatchResult = MailJobBatchResultInput

/**
 * Persist counters/errors after a claimed batch was sent.
 * Never rewrites `pendingGuestIds` from a stale in-memory snapshot.
 */
/**
 * M3: jobs stuck in pending/processing with remaining work and no recent update
 * (dashboard tab closed mid-chain). Cron resumes these via /api/cron/mail-jobs.
 */
export async function listResumableMailJobs(
  staleMs: number = 120_000,
): Promise<MailJob[]> {
  const cutoff = Date.now() - staleMs
  const pick = (jobs: MailJob[]) =>
    jobs.filter((job) => {
      if (job.status !== 'pending' && job.status !== 'processing') return false
      if (!jobHasRemainingWork(job)) return false
      const updated = Date.parse(job.updatedAt)
      if (!Number.isFinite(updated)) return true
      return updated <= cutoff
    })

  if (usePostgresTable()) {
    await ensureMailJobsTable()
    const db = pg()!
    const rows = (await db`
      SELECT id, event_id, kind, payload, status, attempts, last_error, created_at, updated_at
      FROM mail_jobs
      WHERE status IN ('pending', 'processing')
      ORDER BY updated_at ASC
      LIMIT 50
    `) as unknown as Parameters<typeof jobFromRow>[0][]
    return pick(rows.map(jobFromRow))
  }

  const store = await loadPlatformStore()
  return pick(store.mailJobs || [])
}

export async function recordMailJobBatchResult(
  jobId: string,
  result: MailJobBatchResult,
): Promise<MailJob | null> {
  if (usePostgresTable()) {
    await ensureMailJobsTable()
    const db = pg()!
    return db.begin(async (tx) => {
      const rows = (await tx`
        SELECT id, event_id, kind, payload, status, attempts, last_error, created_at, updated_at
        FROM mail_jobs WHERE id = ${jobId} LIMIT 1 FOR UPDATE
      `) as unknown as Parameters<typeof jobFromRow>[0][]
      if (!rows[0]) return null
      const job = applyRecordMailJobBatchResult(jobFromRow(rows[0]), result)
      await tx`
        UPDATE mail_jobs
        SET
          payload = ${tx.json(payloadOf(job) as never)},
          status = ${job.status},
          attempts = ${job.attempts},
          last_error = ${job.lastError || null},
          updated_at = ${job.updatedAt}
        WHERE id = ${job.id}
      `
      return job
    })
  }

  return withLock(async () => {
    const store = await loadPlatformStore()
    const job = store.mailJobs?.find((item) => item.id === jobId)
    if (!job) return null
    const next = applyRecordMailJobBatchResult(job, result)
    if (!store.mailJobs) store.mailJobs = []
    const idx = store.mailJobs.findIndex((item) => item.id === jobId)
    if (idx >= 0) store.mailJobs[idx] = next
    await savePlatformStore(store)
    return next
  })
}

