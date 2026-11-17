import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chromeCtaText, guestDisplayLocale, inviteRsvpLabel } from '../lib/platform/guest-locale.ts'
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
    openLabel: '',
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
    timeLabel: '',
    placeLabel: "Congregation B'nai Torah",
    cityLabel: '',
    dateLabel: '',
    title: '',
    eventName: '',
    heading: '',
    hosts: '',
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

function configWithPtBase(): EventConfig {
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
    locales: { default: 'pt', enabled: ['pt', 'en'] },
    story: { headline: '', subtitle: '' },
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

describe('guest locale chrome CTAs', () => {
  it('uses guest inviteLocale over event default', () => {
    const guest = normalizeGuest({ familyName: 'Teste1', inviteLocale: 'en' })
    assert.equal(guestDisplayLocale(guest, configWithPtBase()), 'en')
  })

  it('does not leak PT base CTAs onto EN guests', () => {
    const config = configWithPtBase()
    assert.equal(chromeCtaText(config, 'en', 'invite', 'ctaView', 'VIEW THE INVITATION'), 'VIEW THE INVITATION')
    assert.equal(inviteRsvpLabel(config, 'en', config.invitation.design, 'Confirm attendance'), 'Confirm attendance')
  })

  it('keeps base CTAs for the event default locale', () => {
    const config = configWithPtBase()
    assert.equal(chromeCtaText(config, 'pt', 'invite', 'ctaView', 'VER O CONVITE'), 'VER O CONVITE')
    assert.equal(inviteRsvpLabel(config, 'pt', config.invitation.design, 'Confirmar presença'), 'Confirmar presença')
  })
})

describe('mailHtml invite locale + links', () => {
  it('renders EN chrome and points every CTA to the invitation card', () => {
    const guest = normalizeGuest({
      familyName: 'Teste1',
      email: 'guest@example.com',
      token: 'j7WFnpzq5ctV',
      inviteLocale: 'en',
    })
    const html = mailHtml('invite', configWithPtBase(), 'mitzvah.pro', guest)

    assert.match(html, /VIEW THE INVITATION/)
    assert.match(html, /Confirm attendance/)
    assert.doesNotMatch(html, /VER O CONVITE/)
    assert.doesNotMatch(html, /Confirmar presença/)
    assert.doesNotMatch(html, /\/rsvp\//)
    assert.doesNotMatch(html, /maps\.example/)
    assert.doesNotMatch(html, /calendar\.google/)
    const cardLinks = html.match(/href="[^"]*\/card\/j7WFnpzq5ctV"/g) || []
    assert.ok(cardLinks.length >= 4)
  })
})
