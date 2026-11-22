import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  mailTargetsEmptyReason,
  selectMailTargets,
  shouldSkipAlreadySent,
} from '../lib/platform/mail-targets.ts'
import type { Guest } from '../lib/platform/types.ts'

function guest(partial: Partial<Guest> & Pick<Guest, 'id' | 'familyName'>): Guest {
  return {
    email: '',
    emails: [],
    partySize: 1,
    status: 'pending',
    meal: '',
    dietary: '',
    message: '',
    createdAt: '',
    token: partial.id,
    inviteLocale: 'en',
    scheduleInviteMode: 'all',
    scheduleItemIds: [],
    openRsvp: false,
    notes: '',
    people: [],
    stdSentAt: null,
    inviteSentAt: null,
    ...partial,
  } as Guest
}

describe('selectMailTargets', () => {
  const list = [
    guest({ id: 'a', familyName: 'Alpha', email: 'a@x.com', inviteSentAt: null }),
    guest({ id: 'b', familyName: 'Beta', email: 'b@x.com', inviteSentAt: '2026-01-01' }),
    guest({ id: 'c', familyName: 'NoMail', email: '', inviteSentAt: null }),
    guest({ id: 'd', familyName: 'Delta', email: 'd@x.com', stdSentAt: '2026-01-01' }),
  ]

  it('bulk invite skips already-sent and guests without email', () => {
    const targets = selectMailTargets(list, 'invite')
    assert.deepEqual(
      targets.map((g) => g.id),
      ['a', 'd'],
    )
  })

  it('bulk std skips already-sent std', () => {
    const targets = selectMailTargets(list, 'std')
    assert.deepEqual(
      targets.map((g) => g.id),
      ['a', 'b'],
    )
  })

  it('guestIds allows re-send even when already sent', () => {
    const targets = selectMailTargets(list, 'invite', ['b'])
    assert.equal(targets.length, 1)
    assert.equal(targets[0]?.id, 'b')
  })

  it('guestIds still requires email', () => {
    assert.deepEqual(selectMailTargets(list, 'invite', ['c']), [])
  })
})

describe('mailTargetsEmptyReason', () => {
  it('explains when everyone already got the invite', () => {
    const list = [
      guest({ id: 'a', familyName: 'A', email: 'a@x.com', inviteSentAt: '2026-01-01' }),
      guest({ id: 'b', familyName: 'B', email: 'b@x.com', inviteSentAt: '2026-01-02' }),
    ]
    assert.match(mailTargetsEmptyReason(list, 'invite'), /já receberam o convite/)
  })

  it('explains missing email on individual send', () => {
    const list = [guest({ id: 'c', familyName: 'C', email: '' })]
    assert.match(mailTargetsEmptyReason(list, 'invite', ['c']), /não tem email/)
  })
})

describe('shouldSkipAlreadySent', () => {
  const jobCreatedAt = '2026-11-21T20:00:00.000Z'

  it('does not skip when never sent (first bulk/individual send)', () => {
    assert.equal(shouldSkipAlreadySent(null, jobCreatedAt), false)
    assert.equal(shouldSkipAlreadySent(undefined, jobCreatedAt), false)
  })

  it('does not skip prior campaign — allows intentional individual re-send', () => {
    assert.equal(shouldSkipAlreadySent('2026-11-21T12:00:00.000Z', jobCreatedAt), false)
  })

  it('skips when this job already marked the guest (lease reclaim)', () => {
    assert.equal(shouldSkipAlreadySent('2026-11-21T20:00:01.000Z', jobCreatedAt), true)
    assert.equal(shouldSkipAlreadySent(jobCreatedAt, jobCreatedAt), true)
  })
})
