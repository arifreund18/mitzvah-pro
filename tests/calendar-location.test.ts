import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { google, locationOf, titleOf } from '../lib/platform/calendar.ts'
import type { CardDesign, EventConfig } from '../lib/platform/types.ts'

/** Minimal config without loading defaults.ts (ESM strip-types). */
function sampleDesign(partial: Partial<CardDesign> = {}): CardDesign {
  return {
    pageColor: '#1a2033',
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
    bodyColor: '#3b2418',
    introColor: '#6a5b4c',
    headingColor: '#1c1630',
    bodySizePx: 16,
    bodyBold: false,
    introSizePx: 14,
    introBold: false,
    headingSizePx: 28,
    headingBold: true,
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

function config(opts: {
  placeLabel?: string
  address1?: string
  address2?: string
  city?: string
  country?: string
  date?: string
  startTime?: string
  subject?: string
  honoreeName?: string
  seoTitle?: string
}): EventConfig {
  return {
    domain: { slug: 'beni', seoTitle: opts.seoTitle || '' },
    basics: {
      type: 'bar',
      honoreeName: opts.honoreeName || 'Beni',
      familyName: 'Freund',
      date: opts.date || '',
      startTime: opts.startTime || '17:00',
      city: opts.city || '',
      country: opts.country || '',
    },
    story: { headline: '', subtitle: '' },
    invitation: {
      greeting: '',
      body: '',
      hostLine: '',
      sealLabel: '',
      sealImageUrl: '',
      intro: '',
      design: sampleDesign({
        placeLabel: opts.placeLabel || '',
        address1: opts.address1 || '',
        address2: opts.address2 || '',
        subject: opts.subject || '',
      }),
    },
    saveTheDate: { design: sampleDesign() },
  } as unknown as EventConfig
}

describe('locationOf', () => {
  it('uses placeLabel + address lines from the invitation design', () => {
    const location = locationOf(
      config({
        placeLabel: "Congregation B'nai Torah",
        address1: '700 Mount Vernon Hwy NE, Atlanta, GA',
        city: 'Sandy Springs',
        country: 'USA',
      }),
      'invite',
    )
    assert.equal(
      location,
      "Congregation B'nai Torah, 700 Mount Vernon Hwy NE, Atlanta, GA",
    )
    assert.equal(location.includes('Sandy Springs'), false)
    assert.equal(location.includes('USA'), false)
  })

  it('falls back to city/country when design address is empty', () => {
    assert.equal(
      locationOf(config({ city: 'Atlanta', country: 'USA' }), 'invite'),
      'Atlanta, USA',
    )
  })

  it('puts the full venue into the Google Calendar deep link', () => {
    const href = google(
      config({
        date: '2027-01-30',
        startTime: '17:00',
        placeLabel: "Congregation B'nai Torah",
        address1: '700 Mount Vernon Hwy NE, Atlanta, GA',
        city: 'Sandy Springs',
        country: 'USA',
      }),
      'invite',
    )
    assert.ok(href)
    const location = new URL(href).searchParams.get('location') || ''
    assert.equal(
      location,
      "Congregation B'nai Torah, 700 Mount Vernon Hwy NE, Atlanta, GA",
    )
  })
})

describe('titleOf', () => {
  it('uses Assunto (email) subject for the calendar event name', () => {
    assert.equal(
      titleOf(
        config({
          subject: "Laura Adissi's Bat Mitzvah",
          honoreeName: 'Laura Adissi',
          seoTitle: 'Laura Adissi — Mitzvah.pro',
        }),
        'invite',
      ),
      "Laura Adissi's Bat Mitzvah",
    )
  })

  it('puts subject into the Google Calendar text param', () => {
    const href = google(
      config({
        date: '2027-02-13',
        startTime: '17:30',
        subject: "Laura Adissi's Bat Mitzvah",
        seoTitle: 'Laura Adissi — Mitzvah.pro',
      }),
      'invite',
    )
    assert.ok(href)
    assert.equal(new URL(href).searchParams.get('text'), "Laura Adissi's Bat Mitzvah")
  })
})
