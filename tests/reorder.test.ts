import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { moveArrayItem } from '../lib/platform/reorder.ts'

describe('moveArrayItem', () => {
  it('moves an item up', () => {
    assert.deepEqual(moveArrayItem(['a', 'b', 'c'], 1, 'up'), ['b', 'a', 'c'])
  })

  it('moves an item down', () => {
    assert.deepEqual(moveArrayItem(['a', 'b', 'c'], 0, 'down'), ['b', 'a', 'c'])
  })

  it('is a no-op at the edges', () => {
    const items = ['a', 'b', 'c']
    assert.equal(moveArrayItem(items, 0, 'up'), items)
    assert.equal(moveArrayItem(items, 2, 'down'), items)
  })
})
