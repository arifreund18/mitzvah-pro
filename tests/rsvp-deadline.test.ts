import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isRsvpDeadlinePassed } from '../lib/platform/rsvp-deadline.ts'

describe('isRsvpDeadlinePassed', () => {
  it('treats empty deadline as open', () => {
    assert.equal(isRsvpDeadlinePassed(''), false)
  })

  it('keeps the deadline day inclusive', () => {
    assert.equal(
      isRsvpDeadlinePassed('2026-11-18', new Date('2026-11-18T15:00:00.000Z')),
      false,
    )
  })

  it('closes after the deadline day', () => {
    assert.equal(
      isRsvpDeadlinePassed('2026-11-17', new Date('2026-11-18T15:00:00.000Z')),
      true,
    )
  })
})
