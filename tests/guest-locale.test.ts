import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  chromeCtaText,
  coerceGuestInviteLocale,
  inviteRsvpLabel,
  isForeignSystemChrome,
  primaryEventLocale,
  resolveGuestLocale,
  scrubForeignChromeFromDesign,
} from '../lib/platform/guest-locale.ts'
import { mailHtml } from '../lib/platform/mail.ts'
import { normalizeGuest } from '../lib/platform/normalize-guest.ts'
import type { CardDesign, EventConfig } from '../lib/platform/types.ts'

function sampleDesign(partial: Partial<CardDesign> = {}): CardDesign {
  return {
    pageColor: '#f5f5f5',
    pageTexture: '',
    envelopeColor: '#c4a574',
    envelopeTexture: '',
    envelopeLiner: '#f7f1e4',
    envelopeExterior: '',
    envelopeNameColor: '#1c1630',
    sealUrl: '',
    sealBg: '#22d3ee',
    sealLabel: '',
    openLabel: 'Abrir convite',
    forLabel: '',
    fontKey: 'georgia',
    cardColor: '#1a2033',
    cardTextColor: '#ffffff',
    ctaRsvpColor: '#ffffff',
    cardImageUrl: '',
    cardImagePosition: 'center',
    greetingColor: '#6a5b4c',
    nameColor: '#1c1630',
    bodyColor: '#111111',
    introColor: '#6a5b4c',
    headingColor: '#7c6a9a',
    bodySizePx: 16,
    bodyBold: false,
    introSizePx: 14,
    introBold: false,
    headingSizePx: 28,
    headingBold: true,
    panelPhotoUrl: '',
    panelPhotoShape: 'circle',
    panelPhotoPosition: 'center',
    mapUrl: 'https://maps.example/venue',
    address1: '700 Mount Vernon Hwy NE',
    address2: '',
    timeLabel: '5:30 PM',
    placeLabel: "Congregation B'nai Torah",
    cityLabel: '',
    dateLabel: 'Saturday, February 13, 2027 · 5:30 pm - 11:00 pm',
    title: '',
    eventName: "Laura Adissi's Bat Mitzvah",
    heading: '',
    hosts: 'The Adissi family',
    message: '',
    tip: '',
    greeting: '',
    intro: '',
    subject: '',
    ctaView: 'VER O CONVITE',
    ctaCalendar: 'Adicionar ao calendário',
    ctaMap: 'Ver mapa',
    ctaRsvp: 'Confirmar presença',
    rsvpLabel: 'Confirmar presença',
    rsvpHint: '',
    suggestedPalette: '',
    ...partial,
  }
}

function enOnlyConfig(): EventConfig {
  return {
    domain: { slug: 'adissi', seoTitle: '' },
    basics: {
      type: 'bat',
      honoreeName: 'Laura Adissi',
      familyName: 'Adissi',
      date: '2027-02-13',
      startTime: '17:30',
      city: 'Atlanta',
      country: 'USA',
    },
    branding: { primaryColor: '#1a2033', accentColor: '#22d3ee', theme: 'classic' },
    locales: { default: 'en', enabled: ['en'] },
    story: { headline: 'The celebration of Laura Adissi', subtitle: '' },
    invitation: {
      greeting: '',
      body: '',
      hostLine: '',
      sealLabel: '',
      sealImageUrl: '',
      intro: '',
      design: sampleDesign(),
    },
    saveTheDate: { design: sampleDesign(), message: '', envelopeLabel: '' },
  } as unknown as EventConfig
}

describe('resolveGuestLocale / mono-locale', () => {
  it('forces the only enabled locale even when guest.inviteLocale is stale PT', () => {
    const config = enOnlyConfig()
    const guest = normalizeGuest({ familyName: 'Teste1', inviteLocale: 'pt' })
    assert.equal(primaryEventLocale(config), 'en')
    assert.equal(resolveGuestLocale(guest, config), 'en')
    assert.equal(coerceGuestInviteLocale(guest, config).inviteLocale, 'en')
  })
})

describe('foreign chrome detection', () => {
  it('flags PT stock CTAs as foreign for EN', () => {
    assert.equal(isForeignSystemChrome('Confirmar presença', 'en', 'ctaRsvp'), true)
    assert.equal(isForeignSystemChrome('VER O CONVITE', 'en', 'ctaView'), true)
    assert.equal(isForeignSystemChrome('Adicionar ao calendário', 'en', 'ctaCalendar'), true)
    assert.equal(isForeignSystemChrome('Confirm attendance', 'en', 'ctaRsvp'), false)
    assert.equal(isForeignSystemChrome('Join us Friday!', 'en', 'ctaRsvp'), false)
    // Shared across locales — keep for EN
    assert.equal(isForeignSystemChrome('RSVP', 'en', 'ctaRsvp'), false)
  })
})

describe('chromeCtaText for EN-only events with PT leftovers', () => {
  it('ignores Portuguese base design CTAs and uses English system labels', () => {
    const config = enOnlyConfig()
    assert.equal(chromeCtaText(config, 'en', 'invite', 'ctaView', 'VIEW THE INVITATION'), 'VIEW THE INVITATION')
    assert.equal(chromeCtaText(config, 'en', 'invite', 'ctaCalendar', 'Add to calendar'), 'Add to calendar')
    assert.equal(chromeCtaText(config, 'en', 'invite', 'ctaMap', 'View map'), 'View map')
    assert.equal(inviteRsvpLabel(config, 'en', config.invitation.design, 'Confirm attendance'), 'Confirm attendance')
  })

  it('keeps intentional custom CTAs that are not stock foreign strings', () => {
    const config = enOnlyConfig()
    config.invitation.design.ctaRsvp = 'Save my seat'
    assert.equal(inviteRsvpLabel(config, 'en', config.invitation.design, 'Confirm attendance'), 'Save my seat')
  })
})

describe('scrub + guest coerce for EN-only events', () => {
  it('clears foreign PT chrome from EN invitation design', () => {
    const scrubbed = scrubForeignChromeFromDesign(enOnlyConfig().invitation.design, 'en')
    assert.equal(scrubbed.ctaView, '')
    assert.equal(scrubbed.ctaCalendar, '')
    assert.equal(scrubbed.ctaRsvp, '')
    assert.equal(scrubbed.rsvpLabel, '')
    assert.equal(scrubbed.eventName, "Laura Adissi's Bat Mitzvah")
  })

  it('coerces guest inviteLocale to EN on EN-only events', () => {
    const guest = normalizeGuest({ familyName: 'Teste1', inviteLocale: 'pt', token: 'abc' })
    assert.equal(coerceGuestInviteLocale(guest, enOnlyConfig()).inviteLocale, 'en')
  })
})

describe('mailHtml EN-only with PT leftovers', () => {
  it('renders English chrome and keeps calendar/map real', () => {
    const guest = normalizeGuest({
      familyName: 'Teste1',
      email: 'guest@example.com',
      token: 'j7WFnpzq5ctV',
      inviteLocale: 'pt', // stale — event is EN-only
    })
    const html = mailHtml('invite', enOnlyConfig(), 'mitzvah.pro', guest)

    assert.match(html, /VIEW THE INVITATION/)
    assert.match(html, /Confirm attendance/)
    assert.match(html, /Add to calendar/)
    assert.match(html, /View map/)
    assert.doesNotMatch(html, /VER O CONVITE/)
    assert.doesNotMatch(html, /Confirmar presença/)
    assert.doesNotMatch(html, /Adicionar ao calendário/)
    assert.match(html, /maps\.example\/venue/)
    assert.match(html, /calendar\.google|\/api\/platform\/calendar\//)
    assert.match(html, /\/card\/j7WFnpzq5ctV/)
  })
})

describe('scrubForeignChromeFromDesign', () => {
  it('preserves custom English copy while clearing PT stock', () => {
    const scrubbed = scrubForeignChromeFromDesign(
      sampleDesign({ ctaRsvp: 'Save my seat', ctaView: 'VER O CONVITE' }),
      'en',
    )
    assert.equal(scrubbed.ctaRsvp, 'Save my seat')
    assert.equal(scrubbed.ctaView, '')
  })
})
