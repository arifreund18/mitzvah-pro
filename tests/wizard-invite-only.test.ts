import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { wizardStepIdsForProducts } from '../lib/platform/products.ts'

/** Mirrors invite-only product selection (no site). */
const INVITE_ONLY_STEP_IDS = wizardStepIdsForProducts({
  site: false,
  invitation: true,
  saveTheDate: true,
})

const SITE_ONLY_STEPS = [
  'branding',
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
  it('keeps invitation flow steps and drops site-building steps including Look', () => {
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
    const ids = wizardStepIdsForProducts({
      site: true,
      invitation: true,
      saveTheDate: true,
    })
    assert.ok(ids.includes('story'))
    assert.ok(ids.includes('branding'))
    assert.ok(ids.includes('invitation'))
  })

  it('supports multi-select products independently', () => {
    const stdOnly = wizardStepIdsForProducts({
      site: false,
      invitation: false,
      saveTheDate: true,
    })
    assert.ok(stdOnly.includes('saveTheDate'))
    assert.equal(stdOnly.includes('invitation'), false)
    assert.equal(stdOnly.includes('story'), false)
    assert.equal(stdOnly.includes('branding'), false)
  })
})
