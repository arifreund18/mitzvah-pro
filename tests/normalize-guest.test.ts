import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeGuest, normalizePerson } from '../lib/platform/normalize-guest.ts'

describe('normalizeGuest', () => {
  it('creates people[] from partySize when missing', () => {
    const guest = normalizeGuest({
      familyName: 'Cohen',
      email: 'cohen@example.com',
      partySize: 3,
      status: 'yes',
    })
    assert.equal(guest.people.length, 3)
    assert.equal(guest.partySize, 3)
    assert.equal(guest.status, 'yes')
    assert.equal(guest.people[0]?.name, 'Cohen')
    assert.equal(guest.people.every((p) => p.status === 'yes'), true)
    assert.ok(guest.token.length >= 8)
    assert.deepEqual(guest.emails, ['cohen@example.com'])
  })

  it('aggregates status from people', () => {
    const guest = normalizeGuest({
      familyName: 'Levy',
      people: [
        normalizePerson({ name: 'A', status: 'yes' }),
        normalizePerson({ name: 'B', status: 'no' }),
      ],
    })
    assert.equal(guest.status, 'yes')
    assert.equal(guest.partySize, 2)
  })

  it('preserves token and open tracking fields', () => {
    const guest = normalizeGuest({
      familyName: 'Adler',
      token: 'AbCdEfGhIjKl',
      openRsvp: true,
      invitationOpenedAt: '2026-01-01T00:00:00.000Z',
      stdOpenedAt: null,
      emails: ['a@x.com', 'b@x.com'],
    })
    assert.equal(guest.token, 'AbCdEfGhIjKl')
    assert.equal(guest.openRsvp, true)
    assert.equal(guest.invitationOpenedAt, '2026-01-01T00:00:00.000Z')
    assert.equal(guest.stdOpenedAt, null)
    assert.deepEqual(guest.emails, ['a@x.com', 'b@x.com'])
  })
})
