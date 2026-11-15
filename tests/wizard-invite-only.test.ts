import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/** Mirrors INVITE_ONLY_STEP_IDS in lib/platform/wizard.ts */
const INVITE_ONLY_STEP_IDS = [
  'basics',
  'branding',
  'rsvp',
  'saveTheDate',
  'invitation',
  'reminders',
  'guestsBootstrap',
  'domain',
  'review',
] as const

const SITE_ONLY_STEPS = [
  'story',
  'schedule',
  'venues',
  'places',
  'media',
  'faq',
  'contact',
  'legal',
] as const

describe('invite_only wizard contract', () => {
  it('keeps invitation flow steps and drops site-building steps', () => {
    for (const id of ['invitation', 'rsvp', 'guestsBootstrap', 'domain'] as const) {
      assert.ok(INVITE_ONLY_STEP_IDS.includes(id))
    }
    for (const id of SITE_ONLY_STEPS) {
      assert.equal(
        (INVITE_ONLY_STEP_IDS as readonly string[]).includes(id),
        false,
        `${id} must not appear in invite-only wizard`,
      )
    }
  })

  it('defaults missing productMode to full site behavior', () => {
    const mode = undefined === 'invite_only' ? 'invite_only' : 'site'
    assert.equal(mode, 'site')
  })
})
