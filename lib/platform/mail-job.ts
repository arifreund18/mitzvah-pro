import type { MailJob } from './types.ts'

export const MAIL_BATCH_SIZE = 25

export function mailJobProgress(job: MailJob) {
  const total = job.guestIds.length
  const remaining = job.pendingGuestIds.length
  return {
    jobId: job.id,
    eventId: job.eventId,
    kind: job.kind,
    status: job.status,
    total,
    processed: job.processed,
    succeeded: job.succeeded,
    failed: job.failed,
    remaining,
    percent: total ? Math.round((job.processed / total) * 100) : 100,
    errors: job.errors.slice(-20),
    updatedAt: job.updatedAt,
  }
}
