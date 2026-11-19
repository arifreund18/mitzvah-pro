import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { eventHasSite, rsvpSiteHomeHref } from '../lib/platform/rsvp-site-home.ts'
import type { EventConfig } from '../lib/platform/types.ts'

function config(partial: Partial<EventConfig> = {}): EventConfig {
  return {
    products: { site: true, invitation: true, saveTheDate: false },
    productMode: 'site',
    ...partial,
  } as EventConfig
}

describe('eventHasSite', () => {
  it('is true when products.site is set', () => {
    assert.equal(eventHasSite(config({ products: { site: true, invitation: true, saveTheDate: false } })), true)
  })

  it('is false for invite_only without products.site', () => {
    assert.equal(
      eventHasSite(
        config({
          products: { site: false, invitation: true, saveTheDate: false },
          productMode: 'invite_only',
        }),
      ),
      false,
    )
  })

  it('falls back to productMode when products is missing', () => {
    assert.equal(eventHasSite(config({ products: undefined, productMode: 'site' })), true)
    assert.equal(eventHasSite(config({ products: undefined, productMode: 'invite_only' })), false)
  })
})

describe('rsvpSiteHomeHref', () => {
  it('returns null for invite-only events', () => {
    const href = rsvpSiteHomeHref(
      config({ products: { site: false, invitation: true, saveTheDate: false }, productMode: 'invite_only' }),
      'festa',
      { host: 'mitzvah.pro', guestToken: 'tok', locale: 'en' },
    )
    assert.equal(href, null)
  })

  it('points at the event subdomain with guest + lang after RSVP', () => {
    const href = rsvpSiteHomeHref(config(), 'festa', {
      host: 'mitzvah.pro',
      guestToken: 'abc 123',
      locale: 'pt',
    })
    assert.equal(href, 'https://festa.mitzvah.pro/?guest=abc+123&lang=pt')
  })

  it('omits query when no guest or lang', () => {
    const href = rsvpSiteHomeHref(config(), 'festa', { host: 'mitzvah.pro' })
    assert.equal(href, 'https://festa.mitzvah.pro')
  })

  it('uses langQuery when locale is absent (public form)', () => {
    const href = rsvpSiteHomeHref(config(), 'festa', {
      host: 'mitzvah.pro',
      langQuery: 'es',
    })
    assert.equal(href, 'https://festa.mitzvah.pro/?lang=es')
  })
})
