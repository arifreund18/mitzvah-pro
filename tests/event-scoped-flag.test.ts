import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { eventScopedReadsEnabled } from '../lib/platform/feature-flags.ts'

describe('eventScopedReadsEnabled', () => {
  const prevDb = process.env.DATABASE_URL
  const prevFlag = process.env.PLATFORM_EVENT_SCOPED_READS

  afterEach(() => {
    if (prevDb === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = prevDb
    if (prevFlag === undefined) delete process.env.PLATFORM_EVENT_SCOPED_READS
    else process.env.PLATFORM_EVENT_SCOPED_READS = prevFlag
  })

  it('is false without DATABASE_URL', () => {
    delete process.env.DATABASE_URL
    delete process.env.PLATFORM_EVENT_SCOPED_READS
    assert.equal(eventScopedReadsEnabled(), false)
  })

  it('defaults to true when DATABASE_URL is set', () => {
    process.env.DATABASE_URL = 'postgres://localhost/test'
    delete process.env.PLATFORM_EVENT_SCOPED_READS
    assert.equal(eventScopedReadsEnabled(), true)
  })

  it('can be disabled with PLATFORM_EVENT_SCOPED_READS=0', () => {
    process.env.DATABASE_URL = 'postgres://localhost/test'
    process.env.PLATFORM_EVENT_SCOPED_READS = '0'
    assert.equal(eventScopedReadsEnabled(), false)
  })
})
