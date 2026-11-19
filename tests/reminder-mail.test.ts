import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeGuest } from '../lib/platform/normalize-guest.ts'
import {
  mailReminderHtml,
  mailReminderSubject,
  previewReminderDays,
} from '../lib/platform/reminder-mail.ts'
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
    address1: '123 Main St',
    address2: 'Atlanta, GA',
    timeLabel: '10:00',
    placeLabel: 'Temple',
    cityLabel: 'Atlanta',
    dateLabel: 'Saturday, August 29',
    title: '',
    eventName: "teste's Bar Mitzvah",
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
    reminders: {
      enabled: true,
      d30: true,
      d7: true,
      d2: true,
      audienceD30: 'all',
      audienceD7: 'yes',
      audienceD2: 'yes',
      message,
    },
  } as unknown as EventConfig
}

describe('reminder mail preview', () => {
  it('prefers nearer reminder windows for preview days', () => {
    assert.equal(previewReminderDays(config().reminders), 7)
    assert.equal(
      previewReminderDays({
        ...config().reminders,
        d7: false,
        d2: true,
      }),
      2,
    )
    assert.equal(
      previewReminderDays({
        ...config().reminders,
        d7: false,
        d2: false,
        d30: true,
      }),
      30,
    )
  })

  it('builds subject and HTML with VIEW CARD and custom message', () => {
    const cfg = config('Just a friendly reminder that the celebration is this week!')
    const guest = normalizeGuest({
      familyName: 'Guests',
      email: 'g@x.com',
      token: 'PREVIEW',
      inviteLocale: 'en',
    })
    assert.match(mailReminderSubject(cfg, guest, 7), /Reminder — teste \(7d\)/)
    const html = mailReminderHtml(cfg, 'testando.mitzvah.pro', guest, 7)
    assert.match(html, /friendly reminder/)
    assert.match(html, /VIEW CARD|VIEW THE INVITATION/i)
    assert.match(html, /Temple/)
  })

  it('keeps body text readable on dark page backgrounds', () => {
    const cfg = config('Mensagem clara no fundo escuro')
    cfg.invitation.design.pageColor = '#1a2033'
    cfg.invitation.design.bodyColor = '#3b2418'
    cfg.invitation.design.headingColor = '#1c1630'
    cfg.invitation.design.cardColor = '#f7f1e4'
    cfg.invitation.design.cardTextColor = '#1c1630'
    cfg.invitation.design.ctaRsvpColor = '#ffffff'
    const guest = normalizeGuest({
      familyName: 'Guests',
      email: 'g@x.com',
      token: 'PREVIEW',
      inviteLocale: 'pt',
    })
    const html = mailReminderHtml(cfg, 'testando.mitzvah.pro', guest, 7)
    assert.match(html, /color:#f3eee6/)
    assert.match(html, /color:#1c1630;background-color:#f7f1e4/)
    assert.match(html, /Mensagem clara no fundo escuro/)
  })
})
