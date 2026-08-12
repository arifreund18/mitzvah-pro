export const EVENT_TYPES = ['bar', 'bat', 'bnei', 'other'] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const THEMES = ['navy', 'ivory', 'forest', 'burgundy'] as const
export type ThemeId = (typeof THEMES)[number]

export const EVENT_LOCALES = ['en', 'pt', 'es', 'he'] as const
export type EventLocale = (typeof EVENT_LOCALES)[number]

export const EVENT_STATUSES = ['draft', 'published', 'archived'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const WIZARD_STEP_IDS = [
  'basics',
  'locales',
  'branding',
  'story',
  'schedule',
  'venues',
  'media',
  'saveTheDate',
  'invitation',
  'rsvp',
  'faq',
  'guestsBootstrap',
  'domain',
  'review',
] as const
export type WizardStepId = (typeof WIZARD_STEP_IDS)[number]

export type ScheduleItem = {
  id: string
  title: string
  time: string
  place: string
  address: string
}

export type Hotel = {
  id: string
  name: string
  url: string
  notes: string
}

export type FaqItem = {
  id: string
  question: string
  answer: string
}

export type EventConfig = {
  basics: {
    type: EventType
    honoreeName: string
    familyName: string
    date: string
    city: string
    country: string
  }
  locales: {
    default: EventLocale
    enabled: EventLocale[]
  }
  branding: {
    theme: ThemeId
    primaryColor: string
    accentColor: string
  }
  story: {
    headline: string
    subtitle: string
    parentsMessage: string
    about: string
  }
  schedule: { items: ScheduleItem[] }
  venues: {
    dressCode: string
    parking: string
    hotels: Hotel[]
  }
  media: {
    heroUrl: string
    gallery: string[]
  }
  saveTheDate: {
    enabled: boolean
    message: string
    envelopeLabel: string
  }
  invitation: {
    greeting: string
    body: string
    hostLine: string
    sealLabel: string
  }
  rsvp: {
    deadline: string
    meals: string[]
    allowPlusOne: boolean
    collectDietary: boolean
    notes: string
  }
  faq: { items: FaqItem[] }
  domain: {
    slug: string
    seoTitle: string
    seoDescription: string
  }
}

export type GuestRsvp = 'pending' | 'yes' | 'no'

export type Guest = {
  id: string
  familyName: string
  email: string
  partySize: number
  status: GuestRsvp
  meal: string
  dietary: string
  message: string
  createdAt: string
}

export type WizardProgress = {
  currentStep: WizardStepId
  completedSteps: WizardStepId[]
}

export type PlatformEvent = {
  id: string
  slug: string
  status: EventStatus
  templateId: 'barbeni'
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  config: EventConfig
  guests: Guest[]
  wizard: WizardProgress
}

export type PlatformStore = {
  events: PlatformEvent[]
}
