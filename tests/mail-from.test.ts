import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  emailAddressOnly,
  eventFromDisplayName,
  eventSendFrom,
  formatFromAddress,
  sanitizeFromDisplayName,
} from '../lib/platform/mail-from.ts'
import type { EventConfig } from '../lib/platform/types.ts'

function config(partial: {
  hostLine?: string
  familyName?: string
  honoreeName?: string
  fromEmail?: string
  mailStatus?: 'verified' | 'skipped' | 'pending' | 'failed'
}): EventConfig {
  return {
    basics: {
      type: 'bat_mitzvah',
      honoreeName: partial.honoreeName || 'Laura Adissi',
      familyName: partial.familyName || 'Adissi',
      date: '',
      startTime: '',
      city: '',
      country: '',
    },
    invitation: {
      greeting: '',
      body: '',
      hostLine: partial.hostLine || '',
      sealLabel: '',
      sealImageUrl: '',
      intro: '',
      design: {} as EventConfig['invitation']['design'],
    },
    domain: {
      slug: 'adissi',
      mail: {
        sendingDomain: '',
        fromEmail: partial.fromEmail || '',
        resendDomainId: '',
        status: partial.mailStatus || 'skipped',
        lastError: '',
        verifiedAt: null,
      },
    },
  } as EventConfig
}

describe('mail from display name', () => {
  it('sanitizes angle brackets and quotes', () => {
    assert.equal(sanitizeFromDisplayName('The "Adissi" <family>'), 'The Adissi family')
  })

  it('extracts bare email from Name <email>', () => {
    assert.equal(emailAddressOnly('Laura <noreply@mitzvah.pro>'), 'noreply@mitzvah.pro')
    assert.equal(emailAddressOnly('noreply@mitzvah.pro'), 'noreply@mitzvah.pro')
  })

  it('formats From with display name', () => {
    assert.equal(
      formatFromAddress('The Adissi family', 'noreply@mitzvah.pro'),
      'The Adissi family <noreply@mitzvah.pro>',
    )
  })

  it('prefers host line over family/honoree', () => {
    assert.equal(
      eventFromDisplayName(
        config({ hostLine: 'The Adissi family', familyName: 'Adissi', honoreeName: 'Laura' }),
      ),
      'The Adissi family',
    )
  })
})

describe('eventSendFrom', () => {
  const prev = process.env.RESEND_FROM_EMAIL

  before(() => {
    process.env.RESEND_FROM_EMAIL = 'noreply@mitzvah.pro'
  })

  after(() => {
    if (prev === undefined) delete process.env.RESEND_FROM_EMAIL
    else process.env.RESEND_FROM_EMAIL = prev
  })

  it('uses host line with shared RESEND_FROM_EMAIL', () => {
    const from = eventSendFrom(config({ hostLine: 'The Adissi family' }))
    assert.equal(from, 'The Adissi family <noreply@mitzvah.pro>')
  })

  it('rewrites verified fromEmail display name to host line', () => {
    const from = eventSendFrom(
      config({
        hostLine: 'Família Adissi',
        mailStatus: 'verified',
        fromEmail: 'Laura Adissi <convites@mail.adissi.mitzvah.pro>',
      }),
    )
    assert.equal(from, 'Família Adissi <convites@mail.adissi.mitzvah.pro>')
  })
})
