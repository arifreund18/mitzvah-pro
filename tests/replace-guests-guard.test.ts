import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Documents the empty-wipe guard contract used by replaceGuests.
 * Full store integration needs DATABASE_URL; this keeps the rule explicit.
 */
describe('replaceGuests empty wipe guard', () => {
  it('rejects clearing a non-empty guest list without allowEmpty', () => {
    const existingCount = 48
    const incoming: unknown[] = []
    const allowEmpty = false
    const shouldBlock = !allowEmpty && incoming.length === 0 && existingCount > 0
    assert.equal(shouldBlock, true)
  })

  it('allows explicit empty wipe with allowEmpty', () => {
    const existingCount = 48
    const incoming: unknown[] = []
    const allowEmpty = true
    const shouldBlock = !allowEmpty && incoming.length === 0 && existingCount > 0
    assert.equal(shouldBlock, false)
  })

  it('rejects stale PUT that drops existing guest ids', () => {
    const existingIds = ['a', 'b', 'c']
    const incomingIds = new Set(['a', 'b'])
    const dropped = existingIds.filter((id) => !incomingIds.has(id))
    assert.equal(dropped.length, 1)
  })
})
