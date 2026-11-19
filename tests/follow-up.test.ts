import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  followUpHeadline,
  followUpSubject,
  normalizeFollowUp,
  previewMessage,
  selectFollowUpTargets,
} from '../lib/platform/follow-up.ts'
import { mailFollowUpHtml, mailFollowUpSubject } from '../lib/platform/mail.ts'
import { normalizeGuest } from '../lib/platform/normalize-guest.ts'
import type { CardDesign, EventConfig, Guest } from '../lib/platform/types.ts'

function guest(partial: Partial<Guest> & { familyName: string; email: string }): Guest {
  return normalizeGuest({
    familyName: partial.familyName,
    email: partial.email,
    emails: partial.emails || [partial.email],
    status: partial.status || 'pending',
    partySize: partial.partySize || 1,
  })
}

describe('follow-up targeting', () => {
  it('filters by audience and requires email', () => {
    const guests = [
      guest({ familyName: 'A', email: 'a@x.com', status: 'yes' }),
      guest({ familyName: 'B', email: 'b@x.com', status: 'pending' }),
      guest({ familyName: 'C', email: '', emails: [], status: 'yes' }),
      guest({ familyName: 'D', email: 'd@x.com', status: 'no' }),
    ]
    assert.equal(selectFollowUpTargets(guests, { audience: 'all', guestIds: [] }).length, 3)
    assert.deepEqual(
      selectFollowUpTargets(guests, { audience: 'yes', guestIds: [] }).map((g) => g.familyName),
      ['A'],
    )
    assert.deepEqual(
      selectFollowUpTargets(guests, { audience: 'all', guestIds: [guests[1]!.id] }).map(
        (g) => g.familyName,
      ),
      ['B'],
    )
  })
})

describe('follow-up copy', () => {
  it('builds subjects and headlines per type', () => {
    assert.match(followUpSubject('reminder', 'en', 'Lucy Bat Mitzvah', 'Hosts'), /Reminder/)
    assert.match(followUpSubject('update', 'pt', 'Festa', 'Hosts'), /Atualização/)
    assert.match(followUpHeadline('message', 'en', 'Carla Silvado'), /Carla Silvado sent you/)
    assert.match(followUpHeadline('update', 'en', 'Host'), /update to the event/i)
    assert.equal(previewMessage('abcdefghij', 5), 'abcd…')
  })

  it('normalizes follow-up rows', () => {
    const row = normalizeFollowUp({
      type: 'update',
      body: '  Moving venues  ',
      audience: 'yes',
    })
    assert.equal(row.type, 'update')
    assert.equal(row.body, 'Moving venues')
    assert.equal(row.audience, 'yes')
    assert.equal(row.sentCount, 0)
  })
})

describe('follow-up email html', () => {
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
      cardColor: '#4a5a3c',
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
      address1: '5645 Dupree Dr',
      address2: 'Sandy Springs, GA',
      timeLabel: '10:30 AM',
      placeLabel: 'Temple Sinai',
      cityLabel: 'Atlanta',
      dateLabel: 'Saturday, November 21',
      title: '',
      eventName: "Lucy Adair's Bat Mitzvah",
      heading: '',
      hosts: 'Stefani and Scott Silverman',
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

  function config(): EventConfig {
    return {
      domain: { slug: 'lucy', seoTitle: '' },
      basics: {
        type: 'bat',
        honoreeName: 'Lucy Adair',
        familyName: 'Silverman',
        date: '2026-11-21',
        startTime: '10:30',
        city: 'Atlanta',
        country: 'US',
      },
      branding: { primaryColor: '#1a2033', accentColor: '#22d3ee', theme: 'classic' },
      locales: { default: 'en', enabled: ['en'] },
      story: { headline: '', subtitle: '' },
      invitation: {
        greeting: '',
        body: '',
        hostLine: 'Stefani and Scott Silverman',
        sealLabel: '',
        sealImageUrl: '',
        intro: '',
        design: sampleDesign(),
      },
      saveTheDate: { design: sampleDesign(), message: '', envelopeLabel: '' },
      followUps: [],
    } as unknown as EventConfig
  }

  it('renders reminder template with VIEW CARD', () => {
    const cfg = config()
    const g = guest({ familyName: 'Guests', email: 'g@x.com' })
    const html = mailFollowUpHtml(
      { type: 'reminder', body: 'Just a friendly reminder that Lucy’s Bat Mitzvah is this Saturday!' },
      cfg,
      'lucy.mitzvah.pro',
      g,
    )
    assert.match(html, /VIEW CARD|VIEW THE INVITATION|Ver o convite/i)
    assert.match(html, /friendly reminder/)
    assert.match(html, /Temple Sinai/)
  })

  it('renders message / update templates with quoted preview', () => {
    const cfg = config()
    const g = guest({ familyName: 'Guests', email: 'g@x.com' })
    const messageHtml = mailFollowUpHtml(
      { type: 'message', body: 'Fala pessoal, pra evitar faltar comida com o buffet' },
      cfg,
      'lucy.mitzvah.pro',
      g,
    )
    assert.match(messageHtml, /sent you a new message/i)
    assert.match(messageHtml, /View message/i)
    assert.match(messageHtml, /Fala pessoal/)

    const updateHtml = mailFollowUpHtml(
      {
        type: 'update',
        body: 'Due to winter weather - we are moving the casino night to my house',
      },
      cfg,
      'lucy.mitzvah.pro',
      g,
    )
    assert.match(updateHtml, /update to the event/i)
    assert.match(updateHtml, /View invitation/i)
    assert.match(updateHtml, /winter weather/)

    assert.match(
      mailFollowUpSubject({ type: 'update', subject: '' }, cfg, g),
      /Update/,
    )
  })
})
