import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  guestMailRecipients,
  isValidEmail,
  parseEmailsInput,
} from '../lib/platform/family-emails.ts'
import { mergeImportedGuestsByEmail, parseGuestImportRows } from '../lib/platform/csv.ts'
import { normalizeGuest, normalizePerson } from '../lib/platform/normalize-guest.ts'

describe('family multi-email', () => {
  it('parses comma-separated emails', () => {
    assert.deepEqual(parseEmailsInput('jambra@gmail.com, carlasilvado@hotmail.com'), [
      'jambra@gmail.com',
      'carlasilvado@hotmail.com',
    ])
    assert.equal(isValidEmail('jambra@gmail.com'), true)
  })

  it('accepts multi-email import rows without invalid email errors', () => {
    const parsed = parseGuestImportRows([
      {
        family_name: 'Bar Beni',
        email: 'jambra@gmail.com, carlasilvado@hotmail.com',
        guest_name: 'Ari',
        type: 'adult',
      },
      {
        family_name: 'Bar Beni',
        email: 'jambra@gmail.com, carlasilvado@hotmail.com',
        guest_name: 'Carla',
        type: 'adult',
      },
    ])
    assert.deepEqual(parsed.errors, [])
    assert.equal(parsed.guests.length, 1)
    assert.deepEqual(parsed.guests[0]?.emails, [
      'jambra@gmail.com',
      'carlasilvado@hotmail.com',
    ])
    assert.equal(parsed.guests[0]?.people.length, 2)
  })

  it('sends to every address on the family', () => {
    const guest = normalizeGuest({
      familyName: 'Bar Beni',
      email: 'jambra@gmail.com, carlasilvado@hotmail.com',
    })
    assert.deepEqual(guestMailRecipients(guest), [
      'jambra@gmail.com',
      'carlasilvado@hotmail.com',
    ])
  })

  it('merges import guests that share an email', () => {
    const merged = mergeImportedGuestsByEmail([
      normalizeGuest({
        familyName: 'A',
        email: 'a@x.com, b@y.com',
        people: [normalizePerson({ name: 'One', type: 'adult', status: 'pending' })],
      }),
      normalizeGuest({
        familyName: 'A',
        emails: ['a@x.com', 'b@y.com'],
        people: [normalizePerson({ name: 'Two', type: 'child', status: 'pending' })],
      }),
    ])
    assert.equal(merged.length, 1)
    assert.equal(merged[0]?.people.length, 2)
  })
})
