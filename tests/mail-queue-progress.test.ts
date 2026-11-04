import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mailJobProgress } from '../lib/platform/mail-job.ts'
import type { MailJob } from '../lib/platform/types.ts'

describe('mailJobProgress', () => {
  it('computes percent from processed/total', () => {
    const job: MailJob = {
      id: 'j1',
      eventId: 'e1',
      kind: 'invite',
      status: 'processing',
      guestIds: ['a', 'b', 'c', 'd'],
      pendingGuestIds: ['c', 'd'],
      processed: 2,
      succeeded: 2,
      failed: 0,
      errors: [],
      host: 'localhost',
      from: 'test@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 1,
      lastError: '',
    }
    const progress = mailJobProgress(job)
    assert.equal(progress.total, 4)
    assert.equal(progress.remaining, 2)
    assert.equal(progress.percent, 50)
  })
})
