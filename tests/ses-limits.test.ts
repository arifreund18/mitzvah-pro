import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifySendError,
  noteSuccessfulSend,
  sesDailyCap,
  sesEventMaxPerSecond,
  sesMinIntervalMs,
  sesSandboxMode,
  sentInLast24h,
} from '../lib/email/ses-limits.ts'

describe('ses-limits', () => {
  const prevProd = process.env.EMAIL_SES_PRODUCTION
  const prevCap = process.env.EMAIL_SES_DAILY_CAP
  const prevInterval = process.env.EMAIL_SES_MIN_INTERVAL_MS
  const prevRate = process.env.EMAIL_SES_EVENT_MAX_PER_SECOND
  const prevProvider = process.env.EMAIL_PROVIDER

  beforeEach(() => {
    delete process.env.EMAIL_SES_PRODUCTION
    delete process.env.EMAIL_SES_DAILY_CAP
    delete process.env.EMAIL_SES_MIN_INTERVAL_MS
    delete process.env.EMAIL_SES_EVENT_MAX_PER_SECOND
    delete process.env.EMAIL_PROVIDER
  })

  afterEach(() => {
    if (prevProd === undefined) delete process.env.EMAIL_SES_PRODUCTION
    else process.env.EMAIL_SES_PRODUCTION = prevProd
    if (prevCap === undefined) delete process.env.EMAIL_SES_DAILY_CAP
    else process.env.EMAIL_SES_DAILY_CAP = prevCap
    if (prevInterval === undefined) delete process.env.EMAIL_SES_MIN_INTERVAL_MS
    else process.env.EMAIL_SES_MIN_INTERVAL_MS = prevInterval
    if (prevRate === undefined) delete process.env.EMAIL_SES_EVENT_MAX_PER_SECOND
    else process.env.EMAIL_SES_EVENT_MAX_PER_SECOND = prevRate
    if (prevProvider === undefined) delete process.env.EMAIL_PROVIDER
    else process.env.EMAIL_PROVIDER = prevProvider
  })

  it('defaults to sandbox limits', () => {
    assert.equal(sesSandboxMode(), true)
    assert.equal(sesMinIntervalMs(), 1000)
    assert.equal(sesDailyCap(), 200)
    assert.equal(sesEventMaxPerSecond(), 1)
  })

  it('keeps a conservative per-event pace when EMAIL_SES_PRODUCTION=true', () => {
    process.env.EMAIL_SES_PRODUCTION = 'true'
    assert.equal(sesSandboxMode(), false)
    assert.equal(sesDailyCap(), Number.POSITIVE_INFINITY)
    // Default 2/s — well below account max (~14/s)
    assert.equal(sesMinIntervalMs(), 500)
    assert.equal(sesEventMaxPerSecond(), 2)
  })

  it('honors EMAIL_SES_EVENT_MAX_PER_SECOND in production', () => {
    process.env.EMAIL_SES_PRODUCTION = 'true'
    process.env.EMAIL_SES_EVENT_MAX_PER_SECOND = '1'
    assert.equal(sesMinIntervalMs(), 1000)
    assert.equal(sesEventMaxPerSecond(), 1)
  })

  it('EMAIL_SES_MIN_INTERVAL_MS overrides rate helpers', () => {
    process.env.EMAIL_SES_PRODUCTION = 'true'
    process.env.EMAIL_SES_MIN_INTERVAL_MS = '250'
    assert.equal(sesMinIntervalMs(), 250)
  })

  it('classifies throttling and unverified as retryable', () => {
    const throttled = classifySendError({ name: 'TooManyRequestsException', message: 'Rate exceeded' })
    assert.equal(throttled.kind, 'throttled')
    assert.equal(throttled.retryable, true)

    const unverified = classifySendError({
      name: 'MessageRejected',
      message: 'Email address is not verified.',
    })
    assert.equal(unverified.kind, 'unverified_recipient')
    assert.equal(unverified.retryable, true)
  })

  it('tracks successful sends in the rolling 24h window', () => {
    const before = sentInLast24h()
    noteSuccessfulSend()
    assert.equal(sentInLast24h(), before + 1)
  })
})
