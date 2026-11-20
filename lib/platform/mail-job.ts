import type { MailJob } from './types.ts'

/**
 * Small batches; pacing lives in lib/email/ses-limits.ts
 * (sandbox ~1/s + 200/24h; production ~2/s per process by default).
 */
export const MAIL_BATCH_SIZE = 10

/** If a worker dies after claim, requeue in-flight IDs after this lease. */
export const MAIL_JOB_IN_FLIGHT_LEASE_MS = 90_000

export function mailJobProgress(job: MailJob) {
  const total = job.guestIds.length
  const remaining =
    job.pendingGuestIds.length +
    (job.deferredGuestIds?.length || 0) +
    (job.inFlightGuestIds?.length || 0)
  return {
    jobId: job.id,
    eventId: job.eventId,
    kind: job.kind,
    status: job.status,
    total,
    processed: job.processed,
    succeeded: job.succeeded,
    failed: job.failed,
    deferred: job.deferred || job.deferredGuestIds?.length || 0,
    remaining,
    percent: total ? Math.round((job.processed / total) * 100) : 100,
    errors: job.errors.slice(-20),
    updatedAt: job.updatedAt,
  }
}

export type MailJobBatchResultInput = {
  succeeded?: number
  failed?: number
  deferredGuestIds?: string[]
  requeueGuestIds?: string[]
  errors?: string[]
  lastError?: string
  retryDeferred?: boolean
}

/** Pure: splice next batch + track in-flight (call under a lock / FOR UPDATE). */
export function applyClaimMailJobBatch(
  job: MailJob,
  batchSize: number,
  nowMs: number = Date.now(),
): { job: MailJob; batch: string[] } {
  if (!job.inFlightGuestIds) job.inFlightGuestIds = []
  if (!job.deferredGuestIds) job.deferredGuestIds = []

  if (job.status === 'completed' || job.status === 'failed') {
    return { job, batch: [] }
  }

  const updatedMs = Date.parse(job.updatedAt) || 0
  const leaseExpired = nowMs - updatedMs > MAIL_JOB_IN_FLIGHT_LEASE_MS
  if (job.inFlightGuestIds.length && (leaseExpired || job.status === 'pending')) {
    job.pendingGuestIds = [...job.inFlightGuestIds, ...job.pendingGuestIds]
    job.inFlightGuestIds = []
  }

  if (job.inFlightGuestIds.length && !leaseExpired) {
    job.updatedAt = new Date(nowMs).toISOString()
    return { job, batch: [] }
  }

  const batch = job.pendingGuestIds.slice(0, Math.max(0, batchSize))
  job.pendingGuestIds = job.pendingGuestIds.slice(batch.length)
  job.inFlightGuestIds = [...batch]
  if (batch.length) {
    job.status = 'processing'
    job.attempts += 1
  } else if ((job.deferredGuestIds?.length || 0) > 0) {
    job.status = 'completed'
  } else {
    job.status = job.succeeded === 0 && job.failed > 0 ? 'failed' : 'completed'
  }
  job.updatedAt = new Date(nowMs).toISOString()
  return { job, batch }
}

/** Pure: apply send counters after a claimed batch (does not trust stale pending). */
export function applyRecordMailJobBatchResult(
  job: MailJob,
  result: MailJobBatchResultInput,
): MailJob {
  if (!job.deferredGuestIds) job.deferredGuestIds = []
  if (!job.inFlightGuestIds) job.inFlightGuestIds = []
  job.inFlightGuestIds = []
  if (result.retryDeferred && job.deferredGuestIds.length) {
    job.pendingGuestIds = [...job.deferredGuestIds, ...job.pendingGuestIds]
    job.deferredGuestIds = []
    job.deferred = 0
  }
  if (result.requeueGuestIds?.length) {
    job.pendingGuestIds = [...result.requeueGuestIds, ...job.pendingGuestIds]
  }
  if (result.succeeded) job.succeeded += result.succeeded
  if (result.failed) job.failed += result.failed
  job.processed = job.succeeded + job.failed
  if (result.deferredGuestIds?.length) {
    job.deferredGuestIds.push(...result.deferredGuestIds)
    job.deferred = job.deferredGuestIds.length
  }
  if (result.errors?.length) job.errors.push(...result.errors)
  if (result.lastError) job.lastError = result.lastError

  if (job.pendingGuestIds.length === 0) {
    if ((job.deferredGuestIds?.length || 0) > 0) {
      job.status = 'completed'
    } else {
      job.status = job.succeeded === 0 && job.failed > 0 ? 'failed' : 'completed'
    }
  } else {
    job.status = 'pending'
  }
  job.updatedAt = new Date().toISOString()
  return job
}
