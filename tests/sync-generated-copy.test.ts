import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyGeneratedPatch, generatedCopy, syncGeneratedCopy } from '../lib/platform/copy.ts'
import type { EventConfig } from '../lib/platform/types.ts'

function baseConfig(overrides: Partial<EventConfig> = {}): EventConfig {
  const copy = generatedCopy('en', 'bar', 'Laura', 'Adissi')
  return {
    products: { site: true, invitation: true, saveTheDate: true },
    productMode: 'site',
    basics: {
      type: 'bar',
      honoreeName: 'Laura',
      familyName: 'Adissi',
      date: '',
      startTime: '10:00',
      city: '',
      country: '',
    },
    locales: { default: 'en', enabled: ['en'] },
    branding: { theme: 'navy', primaryColor: '#0b1020', accentColor: '#22d3ee' },
    story: {
      headline: copy.headline,
      subtitle: copy.subtitle,
      parentsMessage: '',
      about: '',
      honoreeBio: '',
    },
    contentI18n: {},
    schedule: {
      items: [
        {
          id: 'c1',
          title: copy.ceremonyTitle,
          time: '10:00',
          timeEnd: '',
          date: '',
          place: '',
          address: '',
          mapUrl: '',
          dressCode: '',
          notes: '',
          dayLabel: '',
          visibility: 'public',
        },
        {
          id: 'r1',
          title: copy.receptionTitle,
          time: '19:00',
          timeEnd: '',
          date: '',
          place: '',
          address: '',
          mapUrl: '',
          dressCode: '',
          notes: '',
          dayLabel: '',
          visibility: 'public',
        },
      ],
    },
    venues: { dressCode: '', parking: '', hotels: [] },
    places: [],
    contact: { phone: '', email: '', whatsapp: '', people: [], formEnabled: true },
    travel: { enabled: false, airports: '', currency: '', transport: '', emergency: '' },
    media: { heroUrl: '', gallery: [], galleryItems: [], ambientAudioUrl: '' },
    saveTheDate: {
      enabled: true,
      message: copy.stdMessage,
      envelopeLabel: copy.envelopeLabel,
      design: {},
    },
    invitation: {
      greeting: copy.greeting,
      body: copy.inviteBody,
      hostLine: copy.hostLine,
      sealLabel: 'Mitzvah',
      sealImageUrl: '',
      intro: '',
      design: {},
    },
    rsvp: {
      deadline: '',
      meals: copy.meals,
      allowPlusOne: true,
      collectDietary: true,
      collectMeal: true,
      notes: '',
      publicFormEnabled: false,
      openRsvpDefault: false,
      notifyMode: 'instant',
      notifyEmails: [],
      confirmationMessage: '',
      confirmationEmailTitle: '',
      confirmationEmailHosts: '',
      confirmationEmailBody: '',
      confirmationEmailWebsiteCta: '',
    },
    reminders: {
      enabled: true,
      d30: true,
      d7: true,
      d2: true,
      audienceD30: 'all',
      audienceD7: 'yes',
      audienceD2: 'yes',
      message: '',
    },
    followUpSchedule: {
      enabled: false,
      d30: true,
      d7: true,
      d2: true,
      audienceD30: 'all',
      audienceD7: 'yes',
      audienceD2: 'yes',
      message: '',
    },
    followUps: [],
    faq: { items: [] },
    legal: { privacyHtml: '', termsHtml: '', comingSoon: false, comingSoonMessage: '' },
    domain: {
      slug: 'laura',
      seoTitle: copy.seoTitle,
      seoDescription: copy.seoDescription,
      mail: {
        sendingDomain: '',
        fromEmail: '',
        resendDomainId: '',
        status: 'skipped',
        lastError: '',
        verifiedAt: null,
      },
      customHost: '',
      customHostStatus: 'none',
      customHostToken: 'tok',
    },
    ...overrides,
  } as EventConfig
}

describe('syncGeneratedCopy', () => {
  it('keeps a cleared subtitle empty when the honoree name changes', () => {
    const previous = baseConfig({
      story: {
        headline: 'The celebration of Laura',
        subtitle: '',
        parentsMessage: '',
        about: '',
        honoreeBio: '',
      },
    })
    const next = {
      ...previous,
      basics: { ...previous.basics, honoreeName: 'Sofia' },
    }

    const synced = syncGeneratedCopy(previous, next)
    assert.equal(synced.story.subtitle, '')
  })

  it('refreshes stock subtitle when the locale changes and the field was still generated', () => {
    const previous = baseConfig()
    const next = {
      ...previous,
      locales: { default: 'pt' as const, enabled: ['pt' as const] },
    }

    const synced = syncGeneratedCopy(previous, next)
    assert.equal(synced.story.subtitle, generatedCopy('pt', 'bar', 'Laura', 'Adissi').subtitle)
  })

  it('preserves custom headline and empty invite fields when identity changes', () => {
    const previous = baseConfig({
      story: {
        headline: 'Custom welcome',
        subtitle: '',
        parentsMessage: '',
        about: '',
        honoreeBio: '',
      },
      invitation: {
        greeting: '',
        body: '',
        hostLine: '',
        sealLabel: 'Mitzvah',
        sealImageUrl: '',
        intro: '',
        design: {},
      },
      saveTheDate: {
        enabled: true,
        message: '',
        envelopeLabel: '',
        design: {},
      },
      domain: {
        slug: 'laura',
        seoTitle: '',
        seoDescription: '',
        mail: {
          sendingDomain: '',
          fromEmail: '',
          resendDomainId: '',
          status: 'skipped',
          lastError: '',
          verifiedAt: null,
        },
        customHost: '',
        customHostStatus: 'none',
        customHostToken: 'tok',
      },
    })
    const next = {
      ...previous,
      basics: { ...previous.basics, honoreeName: 'Sofia', familyName: 'Cohen' },
    }

    const synced = syncGeneratedCopy(previous, next)
    assert.equal(synced.story.headline, 'Custom welcome')
    assert.equal(synced.story.subtitle, '')
    assert.equal(synced.invitation.greeting, '')
    assert.equal(synced.invitation.body, '')
    assert.equal(synced.invitation.hostLine, '')
    assert.equal(synced.saveTheDate.message, '')
    assert.equal(synced.saveTheDate.envelopeLabel, '')
    assert.equal(synced.domain.seoTitle, '')
    assert.equal(synced.domain.seoDescription, '')
  })

  it('updates stock generated headline when the honoree name changes via applyGeneratedPatch', () => {
    const previous = baseConfig()
    const synced = applyGeneratedPatch(previous, (draft) => ({
      ...draft,
      basics: { ...draft.basics, honoreeName: 'Sofia' },
    }))
    assert.equal(synced.story.headline, generatedCopy('en', 'bar', 'Sofia', 'Adissi').headline)
    assert.equal(synced.story.subtitle, generatedCopy('en', 'bar', 'Sofia', 'Adissi').subtitle)
  })

  it('does not refill an empty ceremony title when identity changes', () => {
    const previous = baseConfig({
      schedule: {
        items: [
          {
            id: 'c1',
            title: '',
            time: '10:00',
            timeEnd: '',
            date: '',
            place: '',
            address: '',
            mapUrl: '',
            dressCode: '',
            notes: '',
            dayLabel: '',
            visibility: 'public',
          },
        ],
      },
    })
    const next = {
      ...previous,
      basics: { ...previous.basics, honoreeName: 'Sofia' },
    }
    const synced = syncGeneratedCopy(previous, next)
    assert.equal(synced.schedule.items[0]?.title, '')
  })
})
