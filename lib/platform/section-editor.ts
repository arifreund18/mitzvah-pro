import type { WizardStepId } from './types'

export const SECTION_EDITOR_IDS = [
  'story',
  'schedule',
  'venues',
  'places',
  'media',
  'faq',
  'contact',
  'rsvp',
  'saveTheDate',
  'invitation',
  'legal',
  'reminders',
] as const

export type SectionEditorId = (typeof SECTION_EDITOR_IDS)[number]

export function isSectionEditorId(value: string): value is SectionEditorId {
  return (SECTION_EDITOR_IDS as readonly string[]).includes(value)
}

export function sectionAsWizardStep(section: SectionEditorId): WizardStepId {
  return section
}

export const SECTION_LABELS: Record<SectionEditorId, string> = {
  story: 'História',
  schedule: 'Programação',
  venues: 'Locais & hotéis',
  places: 'O que fazer',
  media: 'Mídia',
  faq: 'FAQ',
  contact: 'Contato',
  rsvp: 'RSVP',
  saveTheDate: 'Save the Date',
  invitation: 'Convite',
  legal: 'Legal',
  reminders: 'Lembretes',
}
