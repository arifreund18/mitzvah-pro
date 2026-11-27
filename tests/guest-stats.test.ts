import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { countGuestPeople } from '../lib/platform/guest-stats.ts'
import { normalizeGuest, normalizePerson } from '../lib/platform/normalize-guest.ts'

describe('countGuestPeople', () => {
  it('counts people, not families, including mixed RSVP households', () => {
    const guests = [
      normalizeGuest({
        familyName: 'One',
        people: [
          normalizePerson({ name: 'A', type: 'adult', status: 'yes' }),
          normalizePerson({ name: 'B', type: 'child', status: 'yes' }),
          normalizePerson({ name: 'C', type: 'adult', status: 'no' }),
        ],
      }),
      normalizeGuest({
        familyName: 'Two',
        people: [
          normalizePerson({ name: 'D', type: 'adult', status: 'pending' }),
          normalizePerson({ name: 'E', type: 'child', status: 'pending' }),
        ],
      }),
    ]

    const stats = countGuestPeople(guests)
    assert.equal(stats.total, 5)
    assert.equal(stats.yes, 2)
    assert.equal(stats.no, 1)
    assert.equal(stats.pending, 2)
    assert.equal(stats.peopleYesPending, 4)
    assert.equal(stats.adults, 3)
    assert.equal(stats.children, 2)
  })
})
