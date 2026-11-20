import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAIL_JOB_IN_FLIGHT_LEASE_MS,
  applyClaimMailJobBatch,
  applyRecordMailJobBatchResult,
} from '../lib/platform/mail-job.ts'
import type { MailJob } from '../lib/platform/types.ts'

function baseJob(over: Partial<MailJob> = {}): MailJob {
  const now = new Date().toISOString()
  return {
    id: 'j1',
    eventId: 'e1',
    kind: 'invite',
    status: 'pending',
    guestIds: ['g1', 'g2', 'g3', 'g4', 'g5'],
    pendingGuestIds: ['g1', 'g2', 'g3', 'g4', 'g5'],
    deferredGuestIds: [],
    inFlightGuestIds: [],
    processed: 0,
    succeeded: 0,
    failed: 0,
    deferred: 0,
    errors: [],
    host: 'localhost',
    from: 'test@example.com',
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    lastError: '',
    ...over,
  }
}

describe('applyClaimMailJobBatch', () => {
  it('gives disjoint batches and blocks a second claim while lease is fresh', () => {
    const t0 = Date.parse('2026-11-20T03:00:00.000Z')
    const first = applyClaimMailJobBatch(baseJob(), 2, t0)
    assert.deepEqual(first.batch, ['g1', 'g2'])
    assert.deepEqual(first.job.inFlightGuestIds, ['g1', 'g2'])
    assert.deepEqual(first.job.pendingGuestIds, ['g3', 'g4', 'g5'])
    assert.equal(first.job.status, 'processing')

    const blocked = applyClaimMailJobBatch(first.job, 2, t0 + 1_000)
    assert.deepEqual(blocked.batch, [])
    assert.deepEqual(blocked.job.inFlightGuestIds, ['g1', 'g2'])

    applyRecordMailJobBatchResult(first.job, { succeeded: 2 })
    assert.deepEqual(first.job.inFlightGuestIds, [])
    assert.equal(first.job.status, 'pending')

    const second = applyClaimMailJobBatch(first.job, 2, t0 + 2_000)
    assert.deepEqual(second.batch, ['g3', 'g4'])
    assert.ok(!second.batch.includes('g1'))
  })

  it('requeues stale in-flight IDs after lease expires', () => {
    const t0 = Date.parse('2026-11-20T03:00:00.000Z')
    const claimed = applyClaimMailJobBatch(baseJob({ guestIds: ['a', 'b', 'c'], pendingGuestIds: ['a', 'b', 'c'] }), 2, t0)
    assert.deepEqual(claimed.batch, ['a', 'b'])

    const recovered = applyClaimMailJobBatch(
      claimed.job,
      2,
      t0 + MAIL_JOB_IN_FLIGHT_LEASE_MS + 1,
    )
    assert.deepEqual(recovered.batch, ['a', 'b'])
    assert.deepEqual(recovered.job.pendingGuestIds, ['c'])
  })

  it('does not rewind pending when recording results (lost-update bug)', () => {
    const t0 = Date.parse('2026-11-20T03:00:00.000Z')
    const job = baseJob()
    const a = applyClaimMailJobBatch(job, 2, t0)
    // Simulate another worker advancing pending while A is still sending.
    job.pendingGuestIds = ['g5']
    job.inFlightGuestIds = ['g3', 'g4']
    // Worker A finishes — must not restore stale remaining [g3,g4,g5].
    applyRecordMailJobBatchResult(job, { succeeded: a.batch.length })
    assert.deepEqual(job.pendingGuestIds, ['g5'])
    assert.deepEqual(job.inFlightGuestIds, [])
    assert.equal(job.succeeded, 2)
  })
})
