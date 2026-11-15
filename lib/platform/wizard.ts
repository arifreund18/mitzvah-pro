import { wizardUi } from './copy'
import type { EventConfig, EventLocale, ProductMode, WizardStepId } from './types'
import { WIZARD_STEP_IDS } from './types'

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

/** Steps kept when the family only wants invites (no full event website yet). */
export const INVITE_ONLY_STEP_IDS: readonly WizardStepId[] = [
  'basics',
  'branding',
  'rsvp',
  'saveTheDate',
  'invitation',
  'reminders',
  'guestsBootstrap',
  'domain',
  'review',
]

export function wizardStepIdsFor(mode: ProductMode | undefined): readonly WizardStepId[] {
  if (mode === 'invite_only') return INVITE_ONLY_STEP_IDS
  return WIZARD_STEP_IDS
}

export function wizardSteps(
  locale: EventLocale,
  mode: ProductMode | undefined = 'site',
): WizardStepDef[] {
  const ui = wizardUi(locale)
  return wizardStepIdsFor(mode).map((id) => ({
    id,
    title: ui.steps[id]?.title || id,
    subtitle: ui.steps[id]?.subtitle || '',
    ...STEP_META[id],
  }))
}

export const WIZARD_STEPS = wizardSteps('pt')

export function stepIndex(id: WizardStepId, mode: ProductMode | undefined = 'site'): number {
  return wizardStepIdsFor(mode).indexOf(id)
}

export function adjacentStep(
  id: WizardStepId,
  delta: -1 | 1,
  mode: ProductMode | undefined = 'site',
): WizardStepId | null {
  const ids = wizardStepIdsFor(mode)
  const i = ids.indexOf(id) + delta
  return ids[i] ?? null
}

export function normalizeWizardStep(
  value: string | undefined,
  mode: ProductMode | undefined = 'site',
): WizardStepId {
  const ids = wizardStepIdsFor(mode)
  if (value && (ids as readonly string[]).includes(value)) {
    return value as WizardStepId
  }
  return ids[0] || 'basics'
}

export type ReviewIssue = { step: WizardStepId; message: string }

export function reviewIssues(config: EventConfig): ReviewIssue[] {
  const issues = wizardUi(config.locales.default).issues
  const inviteOnly = config.productMode === 'invite_only'
  const list: ReviewIssue[] = []
  if (!config.basics.honoreeName.trim()) list.push({ step: 'basics', message: issues.honoree })
  if (!config.basics.date) list.push({ step: 'basics', message: issues.date })
  if (!config.basics.city.trim()) list.push({ step: 'basics', message: issues.city })
  if (!inviteOnly) {
    if (!config.story.headline.trim()) list.push({ step: 'story', message: issues.headline })
    if (!config.schedule.items.some((item) => item.title.trim())) {
      list.push({ step: 'schedule', message: issues.schedule })
    }
  }
  if (!config.invitation.body.trim()) list.push({ step: 'invitation', message: issues.invite })
  if (!config.rsvp.deadline) list.push({ step: 'rsvp', message: issues.rsvp })
  if (!config.domain.slug.trim()) list.push({ step: 'domain', message: issues.slug })
  return list
}

export function isStepComplete(id: WizardStepId, config: EventConfig): boolean {
  const related = reviewIssues(config).filter((issue) => issue.step === id)
  if (!STEP_META[id]?.required) return true
  if (config.productMode === 'invite_only' && !INVITE_ONLY_STEP_IDS.includes(id)) return true
  return related.length === 0
}

/** When switching to invite-only, keep the public site as coming-soon until they expand later. */
export function applyProductMode(config: EventConfig, productMode: ProductMode): EventConfig {
  if (productMode === 'invite_only') {
    return {
      ...config,
      productMode,
      legal: {
        ...config.legal,
        comingSoon: true,
        comingSoonMessage:
          config.legal.comingSoonMessage ||
          (config.locales.default === 'en'
            ? 'The event website will be available soon. Your invitation is on the way.'
            : config.locales.default === 'es'
              ? 'El sitio del evento estará disponible pronto. Tu invitación está en camino.'
              : config.locales.default === 'he'
                ? 'אתר האירוע יהיה זמין בקרוב. ההזמנה בדרך.'
                : 'O site do evento estará disponível em breve. O convite segue por email.'),
      },
    }
  }
  return { ...config, productMode }
}
