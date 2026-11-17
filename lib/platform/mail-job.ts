import type { MailJob } from './types.ts'

/**
 * Small batches; pacing lives in lib/email/ses-limits.ts
 * (sandbox ~1/s + 200/24h; production ~2/s per process by default).
 */
export const MAIL_BATCH_SIZE = 10

export function mailJobProgress(job: MailJob) {
  const total = job.guestIds.length
  const remaining = job.pendingGuestIds.length + (job.deferredGuestIds?.length || 0)
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
