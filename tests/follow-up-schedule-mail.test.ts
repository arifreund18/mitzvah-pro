import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  mailFollowUpScheduleHtml,
  mailFollowUpScheduleSubject,
  previewScheduledDays,
} from '../lib/platform/follow-up-schedule-mail.ts'
import { normalizeScheduledGuestMail, DEFAULT_FOLLOW_UP_SCHEDULE } from '../lib/platform/scheduled-guest-mail.ts'
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
    messageColor: '#1c1630',
    bodyColor: '#111111',
    introColor: '#6a5b4c',
    headingColor: '#4a3f32',
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
    mapUrl: 'https://maps.example.com',
    address1: 'Atlanta, GA',
    address2: '',
    timeLabel: '10:00',
    placeLabel: 'Temple',
    cityLabel: 'Atlanta',
    dateLabel: 'Saturday',
    title: '',
    eventName: 'Celebration of teste',
    heading: '',
    hosts: 'The family',
    message: '',
    tip: '',
    greeting: '',
    intro: '',
    subject: '',
    ctaView: 'VIEW CARD',
    ctaCalendar: 'ADD TO CALENDAR',
    ctaMap: 'VIEW LOCATION',
    ctaRsvp: '',
    rsvpLabel: '',
    rsvpHint: '',
    suggestedPalette: '',
    ...partial,
  }
}

function config(message = ''): EventConfig {
  return {
    domain: { slug: 'testando', seoTitle: '' },
    basics: {
      type: 'bar',
      honoreeName: 'teste',
      familyName: 'Family',
      date: '2026-08-29',
      startTime: '10:00',
      city: 'Atlanta',
      country: 'US',
    },
    branding: { primaryColor: '#1a2033', accentColor: '#22d3ee', theme: 'classic' },
    locales: { default: 'en', enabled: ['en'] },
    story: { headline: '', subtitle: '' },
    invitation: {
      greeting: '',
      body: '',
      hostLine: 'The family',
      sealLabel: '',
      sealImageUrl: '',
      intro: '',
      design: sampleDesign(),
    },
    saveTheDate: { design: sampleDesign(), message: '', envelopeLabel: '' },
    reminders: { ...DEFAULT_FOLLOW_UP_SCHEDULE, enabled: true },
    followUpSchedule: { ...DEFAULT_FOLLOW_UP_SCHEDULE, enabled: true, message },
  } as unknown as EventConfig
}

describe('follow-up schedule mail', () => {
  it('defaults schedule to disabled with D-30/7/2 windows', () => {
    const normalized = normalizeScheduledGuestMail(undefined, DEFAULT_FOLLOW_UP_SCHEDULE)
    assert.equal(normalized.enabled, false)
    assert.equal(normalized.d7, true)
    assert.equal(normalized.audienceD7, 'yes')
  })

  it('prefers nearer windows for preview days', () => {
    assert.equal(previewScheduledDays(config().followUpSchedule), 7)
    assert.equal(previewScheduledDays({ d30: true, d7: false, d2: true }), 2)
  })

  it('renders message-layout HTML with custom body', () => {
    const cfg = config('Please bring a dish for the buffet!')
    const guest = normalizeGuest({
      familyName: 'Guests',
      email: 'g@x.com',
      token: 'PREVIEW',
      inviteLocale: 'en',
    })
    assert.match(mailFollowUpScheduleSubject(cfg, guest, 7), /\(7d\)/)
    const html = mailFollowUpScheduleHtml(cfg, 'testando.mitzvah.pro', guest, 7)
    assert.match(html, /Please bring a dish/)
    assert.match(html, /sent you a new message/i)
    assert.doesNotMatch(html, /VIEW CARD/i)
  })
})
