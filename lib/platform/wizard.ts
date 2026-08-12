import { wizardUi } from './copy'
import type { EventConfig, EventLocale, WizardStepId } from './types'
import { WIZARD_STEP_IDS } from './types'

export type WizardStepDef = {
  id: WizardStepId
  title: string
  subtitle: string
  required: boolean
  previewTarget: string
}

const STEP_META: Record<
  WizardStepId,
  { required: boolean; previewTarget: string }
> = {
  basics: { required: true, previewTarget: 'hero' },
  branding: { required: true, previewTarget: 'hero' },
  story: { required: true, previewTarget: 'story' },
  schedule: { required: true, previewTarget: 'schedule' },
  venues: { required: false, previewTarget: 'venues' },
  media: { required: false, previewTarget: 'gallery' },
  faq: { required: false, previewTarget: 'faq' },
  rsvp: { required: true, previewTarget: 'rsvp' },
  saveTheDate: { required: false, previewTarget: 'std' },
  invitation: { required: true, previewTarget: 'invite' },
  guestsBootstrap: { required: false, previewTarget: 'rsvp' },
  domain: { required: true, previewTarget: 'hero' },
  review: { required: true, previewTarget: 'hero' },
}

export function wizardSteps(locale: EventLocale): WizardStepDef[] {
  const ui = wizardUi(locale)
  return WIZARD_STEP_IDS.map((id) => ({
    id,
    title: ui.steps[id].title,
    subtitle: ui.steps[id].subtitle,
    ...STEP_META[id],
  }))
}

export const WIZARD_STEPS = wizardSteps('pt')

export function stepIndex(id: WizardStepId): number {
  return WIZARD_STEP_IDS.indexOf(id)
}

export function adjacentStep(id: WizardStepId, delta: -1 | 1): WizardStepId | null {
  const i = stepIndex(id) + delta
  return WIZARD_STEP_IDS[i] ?? null
}

export function normalizeWizardStep(value: string | undefined): WizardStepId {
  if (value && (WIZARD_STEP_IDS as readonly string[]).includes(value)) {
    return value as WizardStepId
  }
  return 'basics'
}

export type ReviewIssue = { step: WizardStepId; message: string }

export function reviewIssues(config: EventConfig): ReviewIssue[] {
  const issues = wizardUi(config.locales.default).issues
  const list: ReviewIssue[] = []
  if (!config.basics.honoreeName.trim()) list.push({ step: 'basics', message: issues.honoree })
  if (!config.basics.date) list.push({ step: 'basics', message: issues.date })
  if (!config.basics.city.trim()) list.push({ step: 'basics', message: issues.city })
  if (!config.story.headline.trim()) list.push({ step: 'story', message: issues.headline })
  if (!config.schedule.items.some((item) => item.title.trim())) {
    list.push({ step: 'schedule', message: issues.schedule })
  }
  if (!config.invitation.body.trim()) list.push({ step: 'invitation', message: issues.invite })
  if (!config.rsvp.deadline) list.push({ step: 'rsvp', message: issues.rsvp })
  if (!config.domain.slug.trim()) list.push({ step: 'domain', message: issues.slug })
  return list
}

export function isStepComplete(id: WizardStepId, config: EventConfig): boolean {
  const related = reviewIssues(config).filter((issue) => issue.step === id)
  if (!STEP_META[id]?.required) return true
  return related.length === 0
}
