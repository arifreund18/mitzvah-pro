import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canShowSiteRsvp, siteRsvpAnchor } from '../lib/platform/site-rsvp.ts'

describe('canShowSiteRsvp', () => {
  it('hides RSVP on live site without guest or public form', () => {
    assert.equal(canShowSiteRsvp({ mode: 'live', guest: null, publicFormEnabled: false }), false)
  })

  it('shows RSVP when a guest is linked', () => {
    assert.equal(
      canShowSiteRsvp({ mode: 'live', guest: { token: 'abc' }, publicFormEnabled: false }),
      true,
    )
  })

  it('shows RSVP when public form is enabled', () => {
    assert.equal(canShowSiteRsvp({ mode: 'live', guest: null, publicFormEnabled: true }), true)
  })

  it('always shows RSVP in preview mode', () => {
    assert.equal(canShowSiteRsvp({ mode: 'preview', guest: null, publicFormEnabled: false }), true)
  })
})

describe('siteRsvpAnchor', () => {
  it('points to the token/public form when a guest is linked', () => {
    assert.equal(
      siteRsvpAnchor({ mode: 'live', guest: { token: 'abc' }, publicFormEnabled: false }),
      '#rsvp-form',
    )
  })

  it('points to the public form on live when enabled', () => {
    assert.equal(
      siteRsvpAnchor({ mode: 'live', guest: null, publicFormEnabled: true }),
      '#rsvp-form',
    )
  })

  it('points to the RSVP section in preview', () => {
    assert.equal(
      siteRsvpAnchor({ mode: 'preview', guest: null, publicFormEnabled: false }),
      '#rsvp',
    )
  })
})
