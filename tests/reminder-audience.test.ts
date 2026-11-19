import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  guestMatchesReminderAudience,
  resolveReminderAudience,
} from '../lib/platform/reminder-audience.ts'

describe('reminder audience', () => {
  it('matches guests by RSVP status', () => {
    assert.equal(guestMatchesReminderAudience({ status: 'yes' }, 'all'), true)
    assert.equal(guestMatchesReminderAudience({ status: 'pending' }, 'all'), true)
    assert.equal(guestMatchesReminderAudience({ status: 'no' }, 'all'), true)
    assert.equal(guestMatchesReminderAudience({ status: 'yes' }, 'yes'), true)
    assert.equal(guestMatchesReminderAudience({ status: 'pending' }, 'yes'), false)
    assert.equal(guestMatchesReminderAudience({ status: 'pending' }, 'pending'), true)
    assert.equal(guestMatchesReminderAudience({ status: 'yes' }, 'pending'), false)
    assert.equal(guestMatchesReminderAudience({ status: 'no' }, 'pending'), false)
  })

  it('preserves legacy onlyConfirmedForD7D2 defaults', () => {
    // D-30 was always everyone, even when the legacy checkbox was on.
    assert.equal(resolveReminderAudience(30, { onlyConfirmedForD7D2: true }), 'all')
    assert.equal(resolveReminderAudience(30, { onlyConfirmedForD7D2: false }), 'all')
    assert.equal(resolveReminderAudience(7, { onlyConfirmedForD7D2: true }), 'yes')
    assert.equal(resolveReminderAudience(2, { onlyConfirmedForD7D2: true }), 'yes')
    assert.equal(resolveReminderAudience(7, { onlyConfirmedForD7D2: false }), 'all')
    assert.equal(
      resolveReminderAudience(7, { audienceD7: 'pending', onlyConfirmedForD7D2: true }),
      'pending',
    )
    assert.equal(resolveReminderAudience(30, { audienceD30: 'pending' }), 'pending')
  })
})
