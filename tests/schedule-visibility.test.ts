import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scheduleItemsForGuest } from '../lib/platform/schedule-visibility.ts'
import type { Guest, ScheduleItem } from '../lib/platform/types.ts'

const items: ScheduleItem[] = [
  {
    id: 'a',
    title: 'A',
    time: '',
    timeEnd: '',
    date: '',
    place: '',
    address: '',
    mapUrl: '',
    dressCode: '',
    notes: '',
    dayLabel: '',
    visibility: 'public',
  },
  {
    id: 'b',
    title: 'B',
    time: '',
    timeEnd: '',
    date: '',
    place: '',
    address: '',
    mapUrl: '',
    dressCode: '',
    notes: '',
    dayLabel: '',
    visibility: 'invite',
  },
]

describe('scheduleItemsForGuest', () => {
  it('hides invite-only items without guest', () => {
    const visible = scheduleItemsForGuest(items, null, 'live')
    assert.deepEqual(
      visible.map((i) => i.id),
      ['a'],
    )
  })

  it('filters subset by scheduleItemIds', () => {
    const guest = {
      scheduleInviteMode: 'subset',
      scheduleItemIds: ['b'],
    } as Guest
    const visible = scheduleItemsForGuest(items, guest, 'live')
    assert.deepEqual(
      visible.map((i) => i.id),
      ['b'],
    )
  })

  it('returns empty for none', () => {
    const guest = { scheduleInviteMode: 'none', scheduleItemIds: [] } as unknown as Guest
    assert.equal(scheduleItemsForGuest(items, guest, 'live').length, 0)
  })
})
