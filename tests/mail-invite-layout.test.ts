import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
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
    bodyItalic: false,
    introSizePx: 14,
    introBold: false,
    introItalic: true,
    headingSizePx: 28,
    headingBold: true,
    headingItalic: false,
    panelPhotoUrl: '',
    panelPhotoShape: 'circle',
    panelPhotoPosition: 'center',
    mapUrl: '',
    address1: '',
    address2: '',
    timeLabel: '',
    placeLabel: '',
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
    ctaView: '',
    ctaCalendar: '',
    ctaMap: '',
    ctaRsvp: '',
    rsvpLabel: '',
    rsvpHint: '',
    suggestedPalette: '',
    ...partial,
  }
}

function inviteConfig(): EventConfig {
  return {
    domain: { slug: 'beni', seoTitle: '' },
    basics: {
      type: 'bar',
      honoreeName: 'Beni Freund',
      familyName: 'Freund',
      date: '2027-01-30',
      startTime: '17:00',
      city: 'Atlanta',
      country: 'USA',
    },
    branding: { primaryColor: '#1a2033', accentColor: '#22d3ee', theme: 'classic' },
    locales: { default: 'en', enabled: ['en'] },
    story: { headline: '', subtitle: '' },
    invitation: {
      greeting: '',
      body: '',
      hostLine: '',
      sealLabel: '',
      sealImageUrl: '',
      intro: '',
      design: sampleDesign({
        cardColor: '#1a2033',
        cardTextColor: '#ffffff',
        eventName: "Beni Freund's Bar Mitzvah",
        dateLabel: 'Saturday, January 30, 2027',
        timeLabel: '5:00 pm - 11:00 pm',
        placeLabel: "Congregation B'nai Torah",
        address1: '700 Mount Vernon Hwy NE, Atlanta, GA',
        mapUrl: 'https://maps.example/venue',
        sealUrl: 'https://cdn.example/seal.png',
        ctaView: 'VIEW THE CARD',
        ctaCalendar: 'Add to calendar',
        ctaMap: 'View map',
        ctaRsvp: 'RSVP',
        ctaRsvpColor: '#000000',
      }),
    },
    saveTheDate: { design: sampleDesign(), message: '', envelopeLabel: '' },
  } as unknown as EventConfig
}

describe('mailHtml invite (Bar-Beni layout)', () => {
  it('renders view-card link, family name on colored card, details, and RSVP', () => {
    const guest = normalizeGuest({
      familyName: 'Daniela Nudel Freund',
      email: 'guest@example.com',
      token: 'tok123',
      inviteLocale: 'en',
    })

    const html = mailHtml('invite', inviteConfig(), 'mitzvah.pro', guest)

    assert.match(html, /VIEW THE CARD/)
    assert.match(html, /Daniela Nudel Freund/)
    assert.match(html, /Beni Freund's Bar Mitzvah/)
    assert.match(html, /Saturday, January 30, 2027/)
    assert.match(html, /5:00 pm - 11:00 pm/)
    assert.match(html, /Add to calendar/)
    assert.match(html, /Congregation B'nai Torah/)
    assert.match(html, /700 Mount Vernon Hwy NE/)
    assert.match(html, /View map/)
    assert.match(html, />RSVP</)
    assert.match(html, /color:#000000;background-color:#1a2033/)
    assert.match(html, /cdn\.example\/seal\.png/)
    assert.match(html, /background-color:#1a2033/)
    assert.match(html, /\/card\/tok123/)
    assert.doesNotMatch(html, /\/rsvp\//)
    assert.match(html, /maps\.example\/venue/)
    assert.match(html, /calendar\.google|\/api\/platform\/calendar\//)
    assert.match(
      html,
      /700\+Mount\+Vernon\+Hwy\+NE|700%20Mount%20Vernon%20Hwy%20NE|700 Mount Vernon Hwy NE/,
    )
  })
})
