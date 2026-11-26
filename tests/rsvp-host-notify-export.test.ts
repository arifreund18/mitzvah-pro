import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { exportGuestCsv, guestsToImportRows } from '../lib/platform/csv.ts'
import {
  mailRsvpHostNotifyHtml,
  mailRsvpHostNotifySubject,
} from '../lib/platform/mail.ts'
import { normalizeGuest, normalizePerson } from '../lib/platform/normalize-guest.ts'

describe('RSVP host notify email', () => {
  it('lists confirmed names, declined names, and the family message', () => {
    const guest = normalizeGuest({
      familyName: 'Familia 1',
      people: [
        normalizePerson({ name: 'A', status: 'yes' }),
        normalizePerson({ name: 'B', status: 'yes' }),
        normalizePerson({ name: 'C', status: 'no' }),
      ],
      message: 'C nao pode ir.',
    })

    assert.equal(mailRsvpHostNotifySubject(guest), 'Novo RSVP — Familia 1')
    const html = mailRsvpHostNotifyHtml(guest)
    assert.match(html, /Família Familia 1/)
    assert.match(html, /Confirmados:<\/strong> A, B/)
    assert.match(html, /Não podem ir:<\/strong> C/)
    assert.match(html, /Mensagem:<\/strong> C nao pode ir\./)
  })
})

describe('guest export per person', () => {
  it('exports one CSV row per person with family column', () => {
    const guests = [
      normalizeGuest({
        familyName: 'Familia 1',
        email: 'host@example.com',
        people: [
          normalizePerson({ name: 'A', type: 'adult', status: 'yes', meal: 'beef' }),
          normalizePerson({ name: 'B', type: 'child', status: 'yes' }),
          normalizePerson({ name: 'C', type: 'adult', status: 'no' }),
        ],
        message: 'Oi',
      }),
    ]

    const csv = exportGuestCsv(guests)
    const lines = csv.trim().split('\n')
    assert.equal(
      lines[0],
      'familyName,guestName,type,email,status,meal,dietary,message',
    )
    assert.equal(lines.length, 4)
    assert.match(lines[1]!, /^Familia 1,A,adult,host@example.com,yes,beef,,Oi$/)
    assert.match(lines[2]!, /^Familia 1,B,child,host@example.com,yes,,,Oi$/)
    assert.match(lines[3]!, /^Familia 1,C,adult,host@example.com,no,,,Oi$/)
  })

  it('builds one import row per person with family_name', () => {
    const guests = [
      normalizeGuest({
        familyName: 'Familia 1',
        email: 'host@example.com',
        people: [
          normalizePerson({ name: 'A', type: 'adult' }),
          normalizePerson({ name: 'B', type: 'child' }),
        ],
      }),
    ]
    const rows = guestsToImportRows(guests)
    assert.equal(rows.length, 2)
    assert.equal(rows[0]?.family_name, 'Familia 1')
    assert.equal(rows[0]?.guest_name, 'A')
    assert.equal(rows[1]?.guest_name, 'B')
    assert.equal(rows[1]?.type, 'child')
  })
})
