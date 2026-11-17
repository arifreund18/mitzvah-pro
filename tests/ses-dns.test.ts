import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { recommendedDns } from '../lib/email/ses-dns-records.ts'
import { eventConfigurationSetName } from '../lib/email/ses-naming.ts'

describe('SES DNS recommendations', () => {
  const prev = process.env.DMARC_REPORT_EMAIL

  beforeEach(() => {
    delete process.env.DMARC_REPORT_EMAIL
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.DMARC_REPORT_EMAIL
    else process.env.DMARC_REPORT_EMAIL = prev
  })

  it('emits DKIM CNAMEs and omits subdomain SPF', () => {
    const records = recommendedDns('mail.adissi.mitzvah.pro', {
      Tokens: ['aaa', 'bbb', 'ccc'],
      Status: 'PENDING',
    })
    assert.equal(records.filter((r) => r.purpose === 'dkim').length, 3)
    assert.equal(records.filter((r) => r.purpose === 'spf').length, 0)
    assert.equal(records.filter((r) => r.purpose === 'dmarc').length, 0)
  })

  it('adds DMARC with DMARC_REPORT_EMAIL', () => {
    process.env.DMARC_REPORT_EMAIL = 'reports@mitzvah.pro'
    const records = recommendedDns('mail.adissi.mitzvah.pro', { Tokens: ['tok'] })
    const dmarc = records.find((r) => r.purpose === 'dmarc')
    assert.ok(dmarc)
    assert.equal(dmarc!.name, '_dmarc.mail.adissi.mitzvah.pro')
    assert.match(dmarc!.value, /rua=mailto:reports@mitzvah\.pro/)
  })
})

describe('eventConfigurationSetName', () => {
  it('builds a SES-safe mitzvah-{slug} name', () => {
    assert.equal(eventConfigurationSetName('adissi'), 'mitzvah-adissi')
    assert.equal(eventConfigurationSetName('Família Beni!'), 'mitzvah-fam-lia-beni')
  })
})
