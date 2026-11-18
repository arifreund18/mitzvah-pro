import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  eventStartParts,
  google,
  parseClockTime,
  parseTimeRange,
} from '../lib/platform/calendar.ts'
import type { CardDesign, EventConfig } from '../lib/platform/types.ts'

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

function config(opts: {
  date?: string
  startTime?: string
  timeLabel?: string
}): EventConfig {
  return {
    domain: { slug: 'adissi', seoTitle: '' },
    basics: {
      type: 'bat',
      honoreeName: 'Laura Adissi',
      familyName: 'Adissi',
      date: opts.date || '2027-02-13',
      startTime: opts.startTime || '10:00',
      city: 'Atlanta',
      country: 'USA',
    },
    story: { headline: '', subtitle: '' },
    invitation: {
      greeting: '',
      body: '',
      hostLine: '',
      sealLabel: '',
      sealImageUrl: '',
      intro: '',
      design: sampleDesign({ timeLabel: opts.timeLabel || '' }),
    },
    saveTheDate: { design: sampleDesign() },
  } as unknown as EventConfig
}

describe('parseClockTime', () => {
  it('parses 12h and 24h clocks', () => {
    assert.deepEqual(parseClockTime('5:30 pm'), { hour: 17, minute: 30 })
    assert.deepEqual(parseClockTime('11:00 pm'), { hour: 23, minute: 0 })
    assert.deepEqual(parseClockTime('17:30'), { hour: 17, minute: 30 })
  })
})

describe('parseTimeRange', () => {
  it('reads invitation card ranges', () => {
    assert.deepEqual(parseTimeRange('5:30 pm - 11:00 pm'), {
      start: { hour: 17, minute: 30 },
      end: { hour: 23, minute: 0 },
    })
  })
})

describe('eventStartParts / google', () => {
  it('prefers design.timeLabel over basics.startTime', () => {
    const parts = eventStartParts(
      config({ startTime: '10:00', timeLabel: '5:30 pm - 11:00 pm' }),
      'invite',
    )
    assert.ok(parts)
    assert.equal(parts.hour, 17)
    assert.equal(parts.minute, 30)
    assert.equal(parts.endHour, 23)
    assert.equal(parts.endMinute, 0)
  })

  it('puts the parsed range into the Google dates param', () => {
    const href = google(
      config({ date: '2027-02-13', startTime: '10:00', timeLabel: '5:30 pm - 11:00 pm' }),
      'invite',
    )
    assert.ok(href)
    assert.equal(
      new URL(href).searchParams.get('dates'),
      '20270213T173000/20270213T230000',
    )
  })
})
