import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { defaultMailSubject, mailSubject } from '../lib/platform/mail.ts'
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

function inviteConfig(subject = ''): EventConfig {
  return {
    domain: { slug: 'laura', seoTitle: '' },
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
    story: { headline: '', subtitle: '' },
    invitation: {
      greeting: '',
      body: '',
      hostLine: '',
      sealLabel: '',
      sealImageUrl: '',
      intro: '',
      design: sampleDesign({ subject }),
    },
    saveTheDate: { design: sampleDesign(), message: '', envelopeLabel: '' },
  } as unknown as EventConfig
}

describe('mailSubject', () => {
  it('uses the custom subject when set', () => {
    const config = inviteConfig("Laura's celebration")
    assert.equal(mailSubject('invite', config), "Laura's celebration")
  })

  it('falls back to the default when subject is blank (field stays empty in editor)', () => {
    const config = inviteConfig('')
    assert.equal(mailSubject('invite', config), 'Bat Mitzvah — Laura Adissi')
    assert.equal(defaultMailSubject('invite', config), 'Bat Mitzvah — Laura Adissi')
    assert.equal(config.invitation.design.subject, '')
  })

  it('replaces {name} in a custom subject template', () => {
    const config = inviteConfig('Join us for {name}')
    assert.equal(mailSubject('invite', config), 'Join us for Laura Adissi')
  })
})
