import { wizardUi } from './copy.ts'
import {
  applyProducts,
  normalizeProducts,
  wizardStepIdsForProducts,
} from './products.ts'
import type { EventConfig, EventLocale, EventProducts, ProductMode, WizardStepId } from './types.ts'

export type WizardStepDef = {
  id: WizardStepId
  title: string
  subtitle: string
  required: boolean
  previewTarget: string
}

const STEP_META: Record<WizardStepId, { required: boolean; previewTarget: string }> = {
  basics: { required: true, previewTarget: 'hero' },
  branding: { required: true, previewTarget: 'hero' },
  story: { required: true, previewTarget: 'story' },
  schedule: { required: true, previewTarget: 'schedule' },
  venues: { required: false, previewTarget: 'venues' },
  places: { required: false, previewTarget: 'places' },
  media: { required: false, previewTarget: 'gallery' },
  faq: { required: false, previewTarget: 'faq' },
  contact: { required: false, previewTarget: 'contact' },
  rsvp: { required: true, previewTarget: 'rsvp' },
  saveTheDate: { required: false, previewTarget: 'std' },
  invitation: { required: true, previewTarget: 'invite' },
  reminders: { required: false, previewTarget: 'rsvp' },
  guestsBootstrap: { required: false, previewTarget: 'rsvp' },
  legal: { required: false, previewTarget: 'hero' },
  domain: { required: true, previewTarget: 'hero' },
  review: { required: true, previewTarget: 'hero' },
}

function productsOf(
  configOrProducts: EventConfig | EventProducts | ProductMode | undefined,
): EventProducts {
  if (!configOrProducts) return normalizeProducts(undefined, 'site', true)
  if (typeof configOrProducts === 'string') {
    return normalizeProducts(undefined, configOrProducts, true)
  }
  if ('productMode' in configOrProducts || 'locales' in configOrProducts) {
    const config = configOrProducts as EventConfig
    return normalizeProducts(config.products, config.productMode, config.saveTheDate?.enabled)
  }
  return normalizeProducts(configOrProducts as EventProducts)
}

/** @deprecated Prefer wizardStepIdsForProducts; kept for invite-only tests/legacy. */
export const INVITE_ONLY_STEP_IDS: readonly WizardStepId[] = wizardStepIdsForProducts({
  site: false,
  invitation: true,
  saveTheDate: true,
})

export function wizardStepIdsFor(
  modeOrProducts: ProductMode | EventProducts | EventConfig | undefined,
): readonly WizardStepId[] {
  return wizardStepIdsForProducts(productsOf(modeOrProducts))
}

export function wizardSteps(
  locale: EventLocale,
  modeOrProducts: ProductMode | EventProducts | EventConfig | undefined = 'site',
): WizardStepDef[] {
  const ui = wizardUi(locale)
  return wizardStepIdsFor(modeOrProducts).map((id) => ({
    id,
    title: ui.steps[id]?.title || id,
    subtitle: ui.steps[id]?.subtitle || '',
    ...STEP_META[id],
  }))
}

export const WIZARD_STEPS = wizardSteps('pt')

export function stepIndex(
  id: WizardStepId,
  modeOrProducts: ProductMode | EventProducts | EventConfig | undefined = 'site',
): number {
  return wizardStepIdsFor(modeOrProducts).indexOf(id)
}

export function adjacentStep(
  id: WizardStepId,
  delta: -1 | 1,
  modeOrProducts: ProductMode | EventProducts | EventConfig | undefined = 'site',
): WizardStepId | null {
  const ids = wizardStepIdsFor(modeOrProducts)
  const i = ids.indexOf(id) + delta
  return ids[i] ?? null
}

export function normalizeWizardStep(
  value: string | undefined,
  modeOrProducts: ProductMode | EventProducts | EventConfig | undefined = 'site',
): WizardStepId {
  const ids = wizardStepIdsFor(modeOrProducts)
  if (value && (ids as readonly string[]).includes(value)) {
    return value as WizardStepId
  }
  return ids[0] || 'basics'
}

export type ReviewIssue = { step: WizardStepId; message: string }

export function reviewIssues(config: EventConfig): ReviewIssue[] {
  const issues = wizardUi(config.locales.default).issues
  const products = productsOf(config)
  const list: ReviewIssue[] = []
  if (!config.basics.honoreeName.trim()) list.push({ step: 'basics', message: issues.honoree })
  if (!config.basics.date) list.push({ step: 'basics', message: issues.date })
  if (!config.basics.city.trim()) list.push({ step: 'basics', message: issues.city })
  if (products.site) {
    if (!config.story.headline.trim()) list.push({ step: 'story', message: issues.headline })
    if (!config.schedule.items.some((item) => item.title.trim())) {
      list.push({ step: 'schedule', message: issues.schedule })
    }
  }
  if (products.invitation && !config.invitation.body.trim()) {
    list.push({ step: 'invitation', message: issues.invite })
  }
  if ((products.site || products.invitation) && !config.rsvp.deadline) {
    list.push({ step: 'rsvp', message: issues.rsvp })
  }
  if (!config.domain.slug.trim()) list.push({ step: 'domain', message: issues.slug })
  return list
}

export function isStepComplete(id: WizardStepId, config: EventConfig): boolean {
  const related = reviewIssues(config).filter((issue) => issue.step === id)
  if (!STEP_META[id]?.required) return true
  const active = wizardStepIdsFor(config)
  if (!active.includes(id)) return true
  return related.length === 0
}

/** @deprecated Prefer applyProducts. */
export function applyProductMode(config: EventConfig, productMode: ProductMode): EventConfig {
  const current = productsOf(config)
  return applyProducts(config, {
    ...current,
    site: productMode === 'site',
    invitation: current.invitation || productMode === 'invite_only',
  })
}

export { applyProducts } from './products.ts'
