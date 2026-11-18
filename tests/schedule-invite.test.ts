import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyScheduleItemInvitations,
  guestsInvitedToScheduleItem,
  guestInvitedToScheduleItem,
  scheduleStateFromSelection,
  setGuestScheduleInvitation,
  type GuestScheduleState,
} from '../lib/platform/schedule-invite.ts'
import type { Guest } from '../lib/platform/types.ts'

const ALL = ['e1', 'e2', 'e3']
const allState = (): GuestScheduleState => ({ mode: 'all', itemIds: [] })

function guest(
  id: string,
  mode: Guest['scheduleInviteMode'],
  itemIds: string[] = [],
): Guest {
  return {
    id,
    familyName: id,
    email: '',
    emails: [],
    partySize: 1,
    status: 'pending',
    meal: '',
    dietary: '',
    message: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    token: id,
    inviteLocale: 'pt',
    scheduleInviteMode: mode,
    scheduleItemIds: itemIds,
    openRsvp: false,
    notes: '',
    people: [],
    stdSentAt: null,
    inviteSentAt: null,
    stdOpenedAt: null,
    invitationOpenedAt: null,
  }
}

describe('schedule-invite', () => {
  it('treats mode all as invited to every item', () => {
    assert.equal(guestInvitedToScheduleItem(allState(), 'e2', ALL), true)
  })

  it('treats mode none as invited to no items', () => {
    assert.equal(guestInvitedToScheduleItem({ mode: 'none', itemIds: [] }, 'e2', ALL), false)
  })

  it('respects subset restrictions', () => {
    const state: GuestScheduleState = { mode: 'subset', itemIds: ['e1'] }
    assert.equal(guestInvitedToScheduleItem(state, 'e1', ALL), true)
    assert.equal(guestInvitedToScheduleItem(state, 'e2', ALL), false)
  })

  it('removes one item from full-weekend invite', () => {
    assert.deepEqual(setGuestScheduleInvitation(allState(), 'e2', ALL, false), {
      mode: 'subset',
      itemIds: ['e1', 'e3'],
    })
  })

  it('uninviting from the last item becomes none — not all', () => {
    assert.deepEqual(
      setGuestScheduleInvitation({ mode: 'subset', itemIds: ['e2'] }, 'e2', ALL, false),
      { mode: 'none', itemIds: [] },
    )
  })

  it('select none becomes none mode', () => {
    assert.deepEqual(scheduleStateFromSelection([], ALL), { mode: 'none', itemIds: [] })
  })

  it('select all becomes all mode', () => {
    assert.deepEqual(scheduleStateFromSelection(ALL, ALL), { mode: 'all', itemIds: [] })
  })

  it('lists guests invited to an item', () => {
    const guests = [
      guest('f1', 'all'),
      guest('f2', 'subset', ['e1']),
      guest('f3', 'subset', ['e2']),
      guest('f4', 'none'),
    ]
    assert.deepEqual(guestsInvitedToScheduleItem(guests, 'e2', ALL), ['f1', 'f3'])
  })

  it('bulk-replaces invitations for one schedule item', () => {
    const guests = [
      guest('f1', 'all'),
      guest('f2', 'all'),
      guest('f3', 'none'),
    ]
    // Keep f1+f3 on e2; drop f2 from e2.
    const next = applyScheduleItemInvitations(guests, 'e2', ALL, ['f1', 'f3'])
    assert.equal(next[0].scheduleInviteMode, 'all')
    assert.deepEqual(next[0].scheduleItemIds, [])
    assert.equal(next[1].scheduleInviteMode, 'subset')
    assert.deepEqual([...next[1].scheduleItemIds].sort(), ['e1', 'e3'])
    assert.equal(next[2].scheduleInviteMode, 'subset')
    assert.deepEqual(next[2].scheduleItemIds, ['e2'])
  })
})
