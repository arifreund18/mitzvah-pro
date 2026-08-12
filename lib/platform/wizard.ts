import type { EventConfig, WizardStepId } from './types'
import { WIZARD_STEP_IDS } from './types'

export type WizardStepDef = {
  id: WizardStepId
  title: string
  subtitle: string
  required: boolean
  previewTarget: string
}

export const WIZARD_STEPS: WizardStepDef[] = [
  {
    id: 'basics',
    title: 'Celebração',
    subtitle: 'Quem honramos, quando e onde.',
    required: true,
    previewTarget: 'hero',
  },
  {
    id: 'locales',
    title: 'Idiomas',
    subtitle: 'Idioma padrão do site (inclui hebraico RTL).',
    required: true,
    previewTarget: 'hero',
  },
  {
    id: 'branding',
    title: 'Visual',
    subtitle: 'Tema e cores — o preview muda na hora.',
    required: true,
    previewTarget: 'hero',
  },
  {
    id: 'story',
    title: 'Textos',
    subtitle: 'Headline, subtítulo e mensagem da família.',
    required: true,
    previewTarget: 'story',
  },
  {
    id: 'schedule',
    title: 'Programação',
    subtitle: 'Cerimônia, recepção e horários.',
    required: true,
    previewTarget: 'schedule',
  },
  {
    id: 'venues',
    title: 'Locais & hotéis',
    subtitle: 'Dress code, estacionamento e hospedagem.',
    required: false,
    previewTarget: 'venues',
  },
  {
    id: 'media',
    title: 'Fotos',
    subtitle: 'Hero e galeria (URL ou upload local).',
    required: false,
    previewTarget: 'gallery',
  },
  {
    id: 'saveTheDate',
    title: 'Save the Date',
    subtitle: 'Envelope digital e mensagem.',
    required: false,
    previewTarget: 'std',
  },
  {
    id: 'invitation',
    title: 'Convite',
    subtitle: 'Cartão, selo e texto do convite.',
    required: true,
    previewTarget: 'invite',
  },
  {
    id: 'rsvp',
    title: 'RSVP',
    subtitle: 'Prazo, refeições e acompanhante.',
    required: true,
    previewTarget: 'rsvp',
  },
  {
    id: 'faq',
    title: 'FAQ',
    subtitle: 'Perguntas que os convidados sempre fazem.',
    required: false,
    previewTarget: 'faq',
  },
  {
    id: 'guestsBootstrap',
    title: 'Convidados',
    subtitle: 'Lista inicial — RSVPs entram depois.',
    required: false,
    previewTarget: 'rsvp',
  },
  {
    id: 'domain',
    title: 'Publicação',
    subtitle: 'Slug local /e/sua-familia e SEO.',
    required: true,
    previewTarget: 'hero',
  },
  {
    id: 'review',
    title: 'Revisão',
    subtitle: 'Checklist e publicar o site.',
    required: true,
    previewTarget: 'hero',
  },
]

export function stepIndex(id: WizardStepId): number {
  return WIZARD_STEP_IDS.indexOf(id)
}

export function adjacentStep(id: WizardStepId, delta: -1 | 1): WizardStepId | null {
  const i = stepIndex(id) + delta
  return WIZARD_STEPS[i]?.id ?? null
}

export type ReviewIssue = { step: WizardStepId; message: string }

export function reviewIssues(config: EventConfig): ReviewIssue[] {
  const issues: ReviewIssue[] = []
  if (!config.basics.honoreeName.trim()) {
    issues.push({ step: 'basics', message: 'Nome do celebrante' })
  }
  if (!config.basics.date) {
    issues.push({ step: 'basics', message: 'Data da celebração' })
  }
  if (!config.basics.city.trim()) {
    issues.push({ step: 'basics', message: 'Cidade' })
  }
  if (!config.story.headline.trim()) {
    issues.push({ step: 'story', message: 'Headline' })
  }
  if (!config.schedule.items.some((item) => item.title.trim())) {
    issues.push({ step: 'schedule', message: 'Pelo menos um item na programação' })
  }
  if (!config.invitation.body.trim()) {
    issues.push({ step: 'invitation', message: 'Texto do convite' })
  }
  if (!config.rsvp.deadline) {
    issues.push({ step: 'rsvp', message: 'Prazo do RSVP' })
  }
  if (!config.domain.slug.trim()) {
    issues.push({ step: 'domain', message: 'Slug do site' })
  }
  return issues
}

export function isStepComplete(id: WizardStepId, config: EventConfig): boolean {
  const related = reviewIssues(config).filter((issue) => issue.step === id)
  const def = WIZARD_STEPS.find((step) => step.id === id)
  if (!def?.required) return true
  return related.length === 0
}
