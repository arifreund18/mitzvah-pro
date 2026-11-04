import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  calendarDateInTz,
  daysUntilEventDate,
  isoWeekKeyInTz,
  yearMonthInTz,
} from '../lib/platform/event-tz.ts'

describe('event-tz', () => {
  it('formats calendar dates in Sao Paulo', () => {
    // 2024-01-01 02:00 UTC → 2023-12-31 23:00 in America/Sao_Paulo (UTC-3)
    const d = new Date('2024-01-01T02:00:00.000Z')
    assert.equal(calendarDateInTz(d, 'America/Sao_Paulo'), '2023-12-31')
    assert.equal(yearMonthInTz(d, 'America/Sao_Paulo'), '2023-12')
  })

  it('computes days until event date in EVENT_TZ', () => {
    const now = new Date('2024-06-01T15:00:00.000Z')
    // Force deterministic tz via env for this assertion path
    const prev = process.env.EVENT_TZ
    process.env.EVENT_TZ = 'America/Sao_Paulo'
    try {
      assert.equal(daysUntilEventDate('2024-06-01', now), 0)
      assert.equal(daysUntilEventDate('2024-06-08', now), 7)
      assert.equal(daysUntilEventDate('bad', now), null)
    } finally {
      if (prev === undefined) delete process.env.EVENT_TZ
      else process.env.EVENT_TZ = prev
    }
  })

  it('builds iso week keys', () => {
    const d = new Date('2024-01-01T12:00:00.000Z')
    assert.match(isoWeekKeyInTz(d, 'UTC'), /^202[34]-W\d{2}$/)
  })
})
