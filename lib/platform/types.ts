export const EVENT_TYPES = ['bar', 'bat', 'bnei', 'other'] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const THEMES = ['navy', 'ivory', 'forest', 'burgundy'] as const
export type ThemeId = (typeof THEMES)[number]

export const EVENT_LOCALES = ['en', 'pt', 'es', 'he'] as const
export type EventLocale = (typeof EVENT_LOCALES)[number]

export const EVENT_STATUSES = ['draft', 'pending_review', 'approved', 'published', 'archived'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const PLACE_CATEGORIES = ['restaurant', 'shopping', 'museum', 'park', 'other'] as const
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]

export const WIZARD_STEP_IDS = [
  'basics',
  'branding',
  'story',
  'schedule',
  'venues',
  'media',
  'faq',
  'rsvp',
  'saveTheDate',
  'invitation',
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
  walking: string
  mapUrl: string
}

export type LocalPlace = {
  id: string
  name: string
  category: PlaceCategory
  url: string
  mapUrl: string
  notes: string
}

export type FaqItem = {
  id: string
  question: string
  answer: string
}

export type CustomHostStatus = 'none' | 'pending' | 'verified' | 'failed'

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
    honoreeBio: string
  }
  schedule: { items: ScheduleItem[] }
  venues: {
    dressCode: string
    parking: string
    hotels: Hotel[]
  }
  places: LocalPlace[]
  contact: {
    phone: string
    email: string
    whatsapp: string
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
    sealImageUrl: string
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
    mail: EventMailDomain
    customHost: string
    customHostStatus: CustomHostStatus
    customHostToken: string
  }
}

export type MailDomainStatus = 'skipped' | 'pending' | 'verified' | 'failed'

export type EventMailDomain = {
  sendingDomain: string
  fromEmail: string
  resendDomainId: string
  status: MailDomainStatus
  lastError: string
  verifiedAt: string | null
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
  token: string
  stdSentAt: string | null
  inviteSentAt: string | null
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
  previewToken: string
  approvalToken: string
  config: EventConfig
  guests: Guest[]
  wizard: WizardProgress
}

export type PlatformStore = {
  events: PlatformEvent[]
}
