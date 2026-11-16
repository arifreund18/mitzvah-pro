import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeGuest, normalizePerson } from '../lib/platform/normalize-guest.ts'

describe('manual guest add payload', () => {
  it('keeps guest name and adult/child type on people[]', () => {
    const guest = normalizeGuest({
      familyName: 'Silva',
      email: 'silva@example.com',
      status: 'pending',
      people: [
        normalizePerson({
          name: 'Ana',
          type: 'child',
          status: 'pending',
        }),
      ],
    })
    assert.equal(guest.familyName, 'Silva')
    assert.equal(guest.people.length, 1)
    assert.equal(guest.people[0].name, 'Ana')
    assert.equal(guest.people[0].type, 'child')
    assert.equal(guest.partySize, 1)
  })
})
