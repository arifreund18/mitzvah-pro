import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('email log When sort', () => {
  it('orders by parsed time newest-first (not String(Date) localeCompare)', () => {
    const logs = [
      { id: '1', sentAt: '2026-11-10T20:09:29.000Z' },
      { id: '2', sentAt: '2026-11-20T16:31:42.000Z' },
      { id: '3', sentAt: '2026-11-20T16:27:51.000Z' },
      { id: '4', sentAt: '2026-11-16T00:19:42.000Z' },
    ]
    const sorted = logs.slice().sort((a, b) => {
      const ta = Date.parse(a.sentAt) || 0
      const tb = Date.parse(b.sentAt) || 0
      return tb - ta
    })
    assert.deepEqual(
      sorted.map((log) => log.id),
      ['2', '3', '4', '1'],
    )
  })
})
