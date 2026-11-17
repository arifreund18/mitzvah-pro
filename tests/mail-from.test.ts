import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  emailAddressOnly,
  eventFromDisplayName,
  eventHostReplyTo,
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
  } as unknown as EventConfig
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
  const prevResend = process.env.RESEND_FROM_EMAIL
  const prevSes = process.env.SES_FROM_EMAIL
  const prevEmail = process.env.EMAIL_FROM_ADDRESS
  const prevProvider = process.env.EMAIL_PROVIDER
  const prevKey = process.env.AWS_ACCESS_KEY_ID

  before(() => {
    delete process.env.SES_FROM_EMAIL
    delete process.env.EMAIL_FROM_ADDRESS
    delete process.env.AWS_ACCESS_KEY_ID
    process.env.EMAIL_PROVIDER = 'resend'
    process.env.RESEND_FROM_EMAIL = 'noreply@mitzvah.pro'
  })

  after(() => {
    if (prevResend === undefined) delete process.env.RESEND_FROM_EMAIL
    else process.env.RESEND_FROM_EMAIL = prevResend
    if (prevSes === undefined) delete process.env.SES_FROM_EMAIL
    else process.env.SES_FROM_EMAIL = prevSes
    if (prevEmail === undefined) delete process.env.EMAIL_FROM_ADDRESS
    else process.env.EMAIL_FROM_ADDRESS = prevEmail
    if (prevProvider === undefined) delete process.env.EMAIL_PROVIDER
    else process.env.EMAIL_PROVIDER = prevProvider
    if (prevKey === undefined) delete process.env.AWS_ACCESS_KEY_ID
    else process.env.AWS_ACCESS_KEY_ID = prevKey
  })

  it('uses host line with shared RESEND_FROM_EMAIL', () => {
    const from = eventSendFrom(config({ hostLine: 'The Adissi family' }))
    assert.equal(from, 'The Adissi family <noreply@mitzvah.pro>')
  })

  it('prefers EMAIL_FROM_ADDRESS for SES', () => {
    process.env.EMAIL_PROVIDER = 'ses'
    process.env.AWS_ACCESS_KEY_ID = 'test'
    process.env.EMAIL_FROM_ADDRESS = 'convites@mitzvah.pro'
    const from = eventSendFrom(config({ hostLine: 'Bar Mitzvah do Beni' }))
    assert.equal(from, 'Bar Mitzvah do Beni <convites@mitzvah.pro>')
    delete process.env.EMAIL_FROM_ADDRESS
    delete process.env.AWS_ACCESS_KEY_ID
    process.env.EMAIL_PROVIDER = 'resend'
  })

  it('rewrites verified fromEmail display name to host line', () => {
    const from = eventSendFrom(
      config({
        hostLine: 'Família Adissi',
        mailStatus: 'verified',
        fromEmail: 'Laura Adissi <convites@mitzvah.pro>',
      }),
    )
    assert.equal(from, 'Família Adissi <convites@mitzvah.pro>')
  })

  it('resolves host Reply-To from contact email', () => {
    const cfg = config({ hostLine: 'Família Adissi' })
    cfg.contact = {
      phone: '',
      email: 'host@example.com',
      whatsapp: '',
      people: [],
      formEnabled: true,
    }
    assert.equal(eventHostReplyTo(cfg), 'host@example.com')
  })
})
