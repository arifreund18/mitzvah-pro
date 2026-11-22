import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  guestHasYesRsvp,
  guestRsvpNames,
  mailRsvpConfirmationHtml,
  mailRsvpConfirmationSubject,
  RSVP_CONFIRMATION_WEBSITE_CTA_SUGGESTION,
} from '../lib/platform/mail.ts'
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

function inviteConfig(partial: Partial<EventConfig> = {}): EventConfig {
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
      body: 'Invitation body should not appear in confirmation email.',
      hostLine: 'Hosted by Gen and Sam Katz',
      sealLabel: '',
      sealImageUrl: '',
      intro: '',
      design: sampleDesign({
        cardColor: '#1a2033',
        cardTextColor: '#ffffff',
        eventName: "It's Beni's Bar Mitzvah!",
        message: 'Come join us to celebrate our MVP, Beni!',
        dateLabel: 'Sat. Oct. 10',
        timeLabel: '5:00pm - 10:30pm EDT',
        placeLabel: 'Temple Emanu-El of Atlanta',
        address1: '1580 Spalding Dr Sandy Springs, GA 30350',
        mapUrl: 'https://maps.example/venue',
        sealUrl: 'https://cdn.example/seal.png',
        ctaView: 'VIEW CARD',
        ctaCalendar: 'Add to calendar',
        ctaMap: 'View location',
      }),
    },
    saveTheDate: { design: sampleDesign(), message: '', envelopeLabel: '' },
    ...partial,
  } as unknown as EventConfig
}

describe('guestHasYesRsvp', () => {
  it('is true when at least one person is yes', () => {
    const guest = normalizeGuest({
      familyName: 'Katz',
      people: [
        { id: '1', name: 'A', type: 'adult', status: 'no', meal: '', dietary: '' },
        { id: '2', name: 'B', type: 'adult', status: 'yes', meal: '', dietary: '' },
      ],
    })
    assert.equal(guestHasYesRsvp(guest), true)
  })

  it('is false when everyone said no', () => {
    const guest = normalizeGuest({
      familyName: 'Katz',
      people: [{ id: '1', name: 'A', type: 'adult', status: 'no', meal: '', dietary: '' }],
    })
    assert.equal(guestHasYesRsvp(guest), false)
  })
})

describe('mailRsvpConfirmationHtml', () => {
  it('renders attending layout with invite card and token links', () => {
    const guest = normalizeGuest({
      familyName: 'Daniela Nudel Freund',
      email: 'guest@example.com',
      token: 'tok123',
      inviteLocale: 'en',
      people: [{ id: '1', name: 'Daniela', type: 'adult', status: 'yes', meal: '', dietary: '' }],
    })

    const html = mailRsvpConfirmationHtml(inviteConfig(), 'mitzvah.pro', guest)

    assert.match(html, /You're attending\./)
    assert.match(html, /Going Daniela/)
    assert.match(html, /EDIT RESPONSE/)
    assert.match(html, /Daniela Nudel Freund/)
    // Empty confirmation fields stay blank — no invitation-copy fallback under the card.
    assert.doesNotMatch(html, /It&#39;s Beni&#39;s Bar Mitzvah!|It's Beni's Bar Mitzvah!/)
    assert.doesNotMatch(html, /Hosted by Gen and Sam Katz/)
    assert.doesNotMatch(html, /Come join us to celebrate our MVP, Beni!/)
    assert.doesNotMatch(html, /Invitation body should not appear/)
    assert.match(html, /Sat\. Oct\. 10/)
    assert.match(html, /5:00pm - 10:30pm EDT/)
    assert.match(html, /ADD TO CALENDAR/)
    assert.match(html, /Temple Emanu-El of Atlanta/)
    assert.match(html, /1580 Spalding Dr/)
    assert.match(html, /VIEW LOCATION/)
    assert.match(html, new RegExp(RSVP_CONFIRMATION_WEBSITE_CTA_SUGGESTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.doesNotMatch(html, /VIEW CARD/)
    assert.match(html, /cdn\.example\/seal\.png/)
    assert.match(html, /background-color:#1a2033/)
    assert.doesNotMatch(html, /\/card\/tok123/)
    assert.match(html, /\/e\/beni\/\?guest=tok123/)
    assert.match(html, /\/rsvp\/tok123/)
    assert.match(html, /maps\.example\/venue/)
    assert.match(html, /calendar\.google|\/api\/platform\/calendar\//)
  })

  it('omits title, hosts, and body when confirmation email fields are blank', () => {
    const guest = normalizeGuest({
      familyName: 'Katz',
      email: 'guest@example.com',
      token: 'tok-empty',
      inviteLocale: 'en',
      people: [{ id: '1', name: 'Sam', type: 'adult', status: 'yes', meal: '', dietary: '' }],
    })
    const config = inviteConfig()
    config.invitation.body = 'Should stay out of the email'

    const html = mailRsvpConfirmationHtml(config, 'mitzvah.pro', guest)
    assert.doesNotMatch(html, /Should stay out of the email/)
    assert.doesNotMatch(html, /Hosted by Gen and Sam Katz/)
    assert.doesNotMatch(html, /Come join us to celebrate our MVP/)
    assert.doesNotMatch(html, /It&#39;s Beni&#39;s Bar Mitzvah!|It's Beni's Bar Mitzvah!/)
  })

  it('lists going and not-going names when the family is mixed', () => {
    const guest = normalizeGuest({
      familyName: 'Freund',
      email: 'guest@example.com',
      token: 'tok-mix',
      inviteLocale: 'en',
      people: [
        { id: '1', name: 'Daniela', type: 'adult', status: 'yes', meal: '', dietary: '' },
        { id: '2', name: 'Ari', type: 'adult', status: 'yes', meal: '', dietary: '' },
        { id: '3', name: 'Melissa', type: 'adult', status: 'yes', meal: '', dietary: '' },
        { id: '4', name: 'Beni', type: 'child', status: 'no', meal: '', dietary: '' },
      ],
    })

    assert.deepEqual(guestRsvpNames(guest, 'yes'), ['Daniela', 'Ari', 'Melissa'])
    assert.deepEqual(guestRsvpNames(guest, 'no'), ['Beni'])

    const html = mailRsvpConfirmationHtml(inviteConfig(), 'mitzvah.pro', guest)
    assert.match(html, /Going Daniela, Ari, Melissa/)
    assert.match(html, /Not going Beni/)
    assert.match(html, /You're attending\./)
  })

  it('uses confirmation email overrides for title, hosts, and body', () => {
    const config = inviteConfig({
      rsvp: {
        deadline: '',
        meals: [],
        allowPlusOne: true,
        collectDietary: true,
        collectMeal: true,
        notes: '',
        publicFormEnabled: false,
        openRsvpDefault: false,
        notifyMode: 'instant',
        notifyEmails: [],
        confirmationMessage: '',
        confirmationEmailTitle: "Laura Adissi's Bat Mitzvah",
        confirmationEmailHosts: 'Tati and Rodrigo',
        confirmationEmailBody: 'is called to the Torah as a Bat Mitzvah',
        confirmationEmailWebsiteCta: 'Visit our celebration site',
      },
    } as Partial<EventConfig>)

    const guest = normalizeGuest({
      familyName: 'Familia LSA',
      email: 'guest@example.com',
      token: 'tok-custom',
      inviteLocale: 'en',
      people: [{ id: '1', name: 'Daniela', type: 'adult', status: 'yes', meal: '', dietary: '' }],
    })

    const html = mailRsvpConfirmationHtml(config, 'mitzvah.pro', guest)
    assert.match(html, /Laura Adissi/)
    assert.match(html, /Tati and Rodrigo/)
    assert.match(html, /is called to the Torah as a Bat Mitzvah/)
    assert.match(html, /Visit our celebration site/)
    assert.doesNotMatch(html, new RegExp(RSVP_CONFIRMATION_WEBSITE_CTA_SUGGESTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.doesNotMatch(html, /Come join us to celebrate our MVP/)
    assert.doesNotMatch(html, /Hosted by Gen and Sam Katz/)
  })

  it('changes the headline and status when nobody is going', () => {
    const guest = normalizeGuest({
      familyName: 'Katz',
      email: 'guest@example.com',
      token: 'tok-no',
      inviteLocale: 'en',
      people: [{ id: '1', name: 'Sam', type: 'adult', status: 'no', meal: '', dietary: '' }],
    })

    const html = mailRsvpConfirmationHtml(inviteConfig(), 'mitzvah.pro', guest)
    assert.match(html, /You're not attending\./)
    assert.match(html, /Not going Sam/)
    assert.doesNotMatch(html, /You're attending\./)
  })

  it('uses Portuguese copy for PT guests on multi-locale events', () => {
    const config = inviteConfig({
      locales: { default: 'pt', enabled: ['pt', 'en'] },
      invitation: {
        greeting: '',
        body: '',
        hostLine: 'Família Freund',
        sealLabel: '',
        sealImageUrl: '',
        intro: '',
        design: sampleDesign({
          eventName: 'Bar Mitzvah do Beni',
          message: 'Venha celebrar conosco!',
          dateLabel: 'Sáb. 10 de out.',
          timeLabel: '17:00 - 22:30',
          placeLabel: 'Templo',
          address1: 'Rua 1',
          mapUrl: 'https://maps.example/venue',
        }),
      },
    } as Partial<EventConfig>)

    const guest = normalizeGuest({
      familyName: 'Silva',
      email: 'a@x.com',
      token: 'pt-tok',
      inviteLocale: 'pt',
      people: [{ id: '1', name: 'Ana', type: 'adult', status: 'yes', meal: '', dietary: '' }],
    })

    const html = mailRsvpConfirmationHtml(config, 'mitzvah.pro', guest)
    assert.match(html, /Você confirmou presença\./)
    assert.match(html, /Vai Ana/)
    assert.match(html, /EDITAR RESPOSTA/)
    assert.doesNotMatch(html, /Família Freund/)
    assert.doesNotMatch(html, /Venha celebrar conosco!/)
    assert.match(html, /\/rsvp\/pt-tok/)
    assert.match(html, /\/e\/beni\/\?guest=pt-tok/)
    assert.doesNotMatch(html, /\/card\/pt-tok/)
    assert.equal(mailRsvpConfirmationSubject(config, guest), 'RSVP confirmado — Beni Freund')
  })

  it('does not leak PT chrome on EN-only events with stale guest locale', () => {
    const config = inviteConfig({
      locales: { default: 'en', enabled: ['en'] },
    })
    config.invitation.design.ctaView = 'VER O CONVITE'
    config.invitation.design.ctaCalendar = 'Adicionar ao calendário'
    config.invitation.design.ctaMap = 'Ver mapa'

    const guest = normalizeGuest({
      familyName: 'Teste1',
      email: 'guest@example.com',
      token: 'en-tok',
      inviteLocale: 'pt',
      people: [{ id: '1', name: 'A', type: 'adult', status: 'yes', meal: '', dietary: '' }],
    })

    const html = mailRsvpConfirmationHtml(config, 'mitzvah.pro', guest)
    assert.match(html, /You're attending\./)
    assert.match(html, /EDIT RESPONSE/)
    assert.match(html, new RegExp(RSVP_CONFIRMATION_WEBSITE_CTA_SUGGESTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(html, /ADD TO CALENDAR/)
    assert.match(html, /VIEW LOCATION/)
    assert.doesNotMatch(html, /VIEW CARD/)
    assert.doesNotMatch(html, /VER O CONVITE/)
    assert.doesNotMatch(html, /Adicionar ao calendário/)
    assert.doesNotMatch(html, /Ver mapa/)
    assert.doesNotMatch(html, /Você confirmou/)
  })
})
