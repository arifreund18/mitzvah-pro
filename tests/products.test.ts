import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyProducts,
  ensureAtLeastOneProduct,
  normalizeProducts,
  parseProductsInput,
  productModeFrom,
  toggleProduct,
  wizardStepIdsForProducts,
} from '../lib/platform/products.ts'
import type { EventConfig } from '../lib/platform/types.ts'

function minimalConfig(overrides: Partial<EventConfig> = {}): EventConfig {
  return {
    products: { site: true, invitation: true, saveTheDate: true },
    productMode: 'site',
    basics: {
      type: 'bar',
      honoreeName: 'Test',
      familyName: 'Family',
      date: '',
      startTime: '10:00',
      city: '',
      country: '',
    },
    locales: { default: 'pt', enabled: ['pt'] },
    branding: { theme: 'navy', primaryColor: '#0b1020', accentColor: '#22d3ee' },
    story: { headline: '', subtitle: '', parentsMessage: '', about: '', honoreeBio: '' },
    contentI18n: {},
    schedule: { items: [] },
    venues: { dressCode: '', parking: '', hotels: [] },
    places: [],
    contact: { phone: '', email: '', whatsapp: '', people: [], formEnabled: true },
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
    followUps: [],
    faq: { items: [] },
    legal: { privacyHtml: '', termsHtml: '', comingSoon: false, comingSoonMessage: '' },
    domain: {
      slug: 'test',
      seoTitle: '',
      seoDescription: '',
      mail: {
        status: 'none',
        fromEmail: '',
        sendingDomain: '',
        lastError: '',
      },
      customHost: '',
      customHostStatus: 'none',
      customHostToken: '',
    },
    ...overrides,
  } as EventConfig
}

describe('event products', () => {
  it('normalizes legacy invite_only to products without site', () => {
    const products = normalizeProducts(undefined, 'invite_only', true)
    assert.deepEqual(products, {
      site: false,
      invitation: true,
      saveTheDate: true,
    })
    assert.equal(productModeFrom(products), 'invite_only')
  })

  it('keeps at least one product when toggling the last one off', () => {
    const onlyInvite = { site: false, invitation: true, saveTheDate: false }
    assert.deepEqual(toggleProduct(onlyInvite, 'invitation'), onlyInvite)
    assert.deepEqual(ensureAtLeastOneProduct({ site: false, invitation: false, saveTheDate: false }), {
      site: false,
      invitation: true,
      saveTheDate: false,
    })
  })

  it('filters wizard steps by selected products', () => {
    const inviteOnly = wizardStepIdsForProducts({
      site: false,
      invitation: true,
      saveTheDate: true,
    })
    assert.ok(inviteOnly.includes('invitation'))
    assert.ok(inviteOnly.includes('saveTheDate'))
    assert.equal(inviteOnly.includes('story'), false)
    assert.equal(inviteOnly.includes('schedule'), false)

    const siteOnly = wizardStepIdsForProducts({
      site: true,
      invitation: false,
      saveTheDate: false,
    })
    assert.ok(siteOnly.includes('story'))
    assert.ok(siteOnly.includes('branding'))
    assert.equal(siteOnly.includes('invitation'), false)
    assert.equal(siteOnly.includes('saveTheDate'), false)
    assert.equal(siteOnly.includes('guestsBootstrap'), false)

    const noSite = wizardStepIdsForProducts({
      site: false,
      invitation: true,
      saveTheDate: false,
    })
    assert.equal(noSite.includes('branding'), false)
  })

  it('parses create payload multi-select', () => {
    assert.deepEqual(
      parseProductsInput({ site: true, invitation: false, saveTheDate: true }),
      { site: true, invitation: false, saveTheDate: true },
    )
    assert.deepEqual(parseProductsInput(undefined, 'invite_only'), {
      site: false,
      invitation: true,
      saveTheDate: true,
    })
  })

  it('applyProducts syncs productMode, saveTheDate.enabled and comingSoon', () => {
    const base = minimalConfig()
    const next = applyProducts(base, {
      site: false,
      invitation: true,
      saveTheDate: false,
    })
    assert.equal(next.productMode, 'invite_only')
    assert.equal(next.saveTheDate.enabled, false)
    assert.equal(next.legal.comingSoon, true)
    assert.equal(next.products.invitation, true)

    const withSite = applyProducts(next, {
      site: true,
      invitation: true,
      saveTheDate: true,
    })
    assert.equal(withSite.productMode, 'site')
    assert.equal(withSite.legal.comingSoon, false)
    assert.equal(withSite.saveTheDate.enabled, true)
  })
})
