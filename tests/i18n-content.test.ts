import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getLocalized, getLocalizedStory } from '../lib/platform/i18n-content.ts'
import type { EventConfig } from '../lib/platform/types.ts'

function minimalConfig(partial?: {
  headline?: string
  contentI18n?: EventConfig['contentI18n']
}): EventConfig {
  return {
    basics: {
      type: 'bar',
      honoreeName: 'Ada',
      familyName: '',
      date: '',
      startTime: '',
      city: '',
      country: '',
    },
    locales: { default: 'pt', enabled: ['pt', 'en', 'he'] },
    branding: { theme: 'navy', primaryColor: '#000', accentColor: '#0ff' },
    story: {
      headline: partial?.headline || 'Base',
      subtitle: '',
      parentsMessage: '',
      about: '',
      honoreeBio: '',
    },
    contentI18n: partial?.contentI18n || {},
    schedule: { items: [] },
    venues: { dressCode: '', parking: '', hotels: [] },
    places: [],
    contact: { phone: '', email: '', whatsapp: '', people: [], formEnabled: false },
    travel: { enabled: false, airports: '', currency: '', transport: '', emergency: '' },
    media: { heroUrl: '', gallery: [], galleryItems: [], ambientAudioUrl: '' },
    saveTheDate: {
      enabled: true,
      message: '',
      envelopeLabel: '',
      design: {} as EventConfig['saveTheDate']['design'],
    },
    invitation: {
      greeting: '',
      body: '',
      hostLine: '',
      sealLabel: '',
      sealImageUrl: '',
      intro: '',
      design: {} as EventConfig['invitation']['design'],
    },
    rsvp: {
      deadline: '',
      meals: [],
      allowPlusOne: false,
      collectDietary: false,
      collectMeal: false,
      notes: '',
      publicFormEnabled: false,
      openRsvpDefault: false,
      notifyMode: 'off',
      notifyEmails: [],
      confirmationMessage: '',
    },
    reminders: {
      enabled: false,
      d30: false,
      d7: false,
      d2: false,
      onlyConfirmedForD7D2: false,
      message: '',
    },
    faq: { items: [] },
    legal: { privacyHtml: '', termsHtml: '', comingSoon: false },
    domain: { slug: 'demo' },
  } as unknown as EventConfig
}

describe('contentI18n overlays', () => {
  it('falls back to story when overlay empty', () => {
    const config = minimalConfig({ headline: 'Base headline' })
    assert.equal(getLocalized(config, 'en', 'headline'), 'Base headline')
  })

  it('prefers locale overlay', () => {
    const config = minimalConfig({
      headline: 'Base',
      contentI18n: { en: { headline: 'English' }, he: { headline: 'עברית' } },
    })
    assert.equal(getLocalized(config, 'en', 'headline'), 'English')
    assert.equal(getLocalizedStory(config, 'he').headline, 'עברית')
    assert.equal(getLocalized(config, 'pt', 'headline'), 'Base')
  })
})
