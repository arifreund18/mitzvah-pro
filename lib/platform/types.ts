export const EVENT_TYPES = ['bar', 'bat', 'bnei', 'other'] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const THEMES = ['navy', 'ivory', 'forest', 'burgundy'] as const
export type ThemeId = (typeof THEMES)[number]

export const EVENT_LOCALES = ['en', 'pt', 'es', 'he'] as const
export type EventLocale = (typeof EVENT_LOCALES)[number]

export const EVENT_STATUSES = ['draft', 'pending_review', 'approved', 'published', 'archived'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const PLACE_CATEGORIES = [
  'restaurant',
  'shopping',
  'museum',
  'park',
  'family',
  'tips',
  'other',
] as const
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]

export const SCHEDULE_INVITE_MODES = ['all', 'subset', 'none'] as const
export type ScheduleInviteMode = (typeof SCHEDULE_INVITE_MODES)[number]

export const PERSON_TYPES = ['adult', 'child'] as const
export type PersonType = (typeof PERSON_TYPES)[number]

export const NOTIFY_MODES = ['instant', 'daily', 'weekly', 'monthly', 'off'] as const
export type NotifyMode = (typeof NOTIFY_MODES)[number]

export const WIZARD_STEP_IDS = [
  'basics',
  'branding',
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
  'reminders',
  'guestsBootstrap',
  'legal',
  'domain',
  'review',
] as const
export type WizardStepId = (typeof WIZARD_STEP_IDS)[number]

export type LocalizedString = Partial<Record<EventLocale, string>> & { default?: string }

export type ScheduleItem = {
  id: string
  title: string
  time: string
  timeEnd: string
  date: string
  place: string
  address: string
  mapUrl: string
  dressCode: string
  notes: string
  dayLabel: string
  visibility: 'public' | 'invite'
}

export type Hotel = {
  id: string
  name: string
  url: string
  notes: string
  walking: string
  mapUrl: string
  photoUrl: string
  stars: number
  featured: boolean
  bookUrl: string
}

export type LocalPlace = {
  id: string
  name: string
  category: PlaceCategory
  url: string
  mapUrl: string
  notes: string
  photoUrl: string
}

export type FaqItem = {
  id: string
  question: string
  answer: string
  published: boolean
}

export type ContactPerson = {
  id: string
  name: string
  phone: string
  email: string
  whatsapp: string
  whatsappLabel: string
}

export type GalleryItem = {
  id: string
  url: string
  type: 'image' | 'video'
  caption: string
  approved: boolean
  showOnSite: boolean
  sortOrder: number
}

export type CustomHostStatus = 'none' | 'pending' | 'verified' | 'failed'

export type CardDesign = {
  pageColor: string
  pageTexture: string
  envelopeColor: string
  envelopeLiner: string
  sealUrl: string
  sealBg: string
  fontKey: string
  cardColor: string
  cardTextColor: string
  greetingColor: string
  nameColor: string
  bodyColor: string
  bodySizePx: number
  bodyBold: boolean
  panelPhotoUrl: string
  panelPhotoShape: 'circle' | 'rectangle'
  mapUrl: string
  address1: string
  address2: string
  timeLabel: string
  placeLabel: string
  subject: string
  ctaView: string
  ctaCalendar: string
  ctaMap: string
}

export type EventConfig = {
  basics: {
    type: EventType
    honoreeName: string
    familyName: string
    date: string
    startTime: string
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
  /** Per-locale overlays for story fields; falls back to `story.*`. */
  contentI18n?: Partial<
    Record<
      EventLocale,
      {
        headline?: string
        subtitle?: string
        parentsMessage?: string
        about?: string
        honoreeBio?: string
      }
    >
  >
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
    people: ContactPerson[]
    formEnabled: boolean
  }
  travel: {
    enabled: boolean
    airports: string
    currency: string
    transport: string
    emergency: string
  }
  media: {
    heroUrl: string
    gallery: string[]
    galleryItems: GalleryItem[]
    ambientAudioUrl: string
  }
  saveTheDate: {
    enabled: boolean
    message: string
    envelopeLabel: string
    design: CardDesign
  }
  invitation: {
    greeting: string
    body: string
    hostLine: string
    sealLabel: string
    sealImageUrl: string
    intro: string
    design: CardDesign
  }
  rsvp: {
    deadline: string
    meals: string[]
    allowPlusOne: boolean
    collectDietary: boolean
    collectMeal: boolean
    notes: string
    publicFormEnabled: boolean
    openRsvpDefault: boolean
    notifyMode: NotifyMode
    notifyEmails: string[]
    confirmationMessage: string
  }
  reminders: {
    enabled: boolean
    d30: boolean
    d7: boolean
    d2: boolean
    onlyConfirmedForD7D2: boolean
    message: string
  }
  faq: { items: FaqItem[] }
  legal: {
    privacyHtml: string
    termsHtml: string
    comingSoon: boolean
  }
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

export type GuestPerson = {
  id: string
  name: string
  type: PersonType
  status: GuestRsvp
  meal: string
  dietary: string
}

/** Family invite record (legacy name Guest). people[] = individual RSVPs. */
export type Guest = {
  id: string
  familyName: string
  /** Primary email (compat + first of emails[]). */
  email: string
  emails: string[]
  partySize: number
  /** Aggregate status derived from people when present. */
  status: GuestRsvp
  meal: string
  dietary: string
  message: string
  createdAt: string
  token: string
  inviteLocale: EventLocale
  scheduleInviteMode: ScheduleInviteMode
  scheduleItemIds: string[]
  openRsvp: boolean
  notes: string
  people: GuestPerson[]
  stdSentAt: string | null
  inviteSentAt: string | null
  stdOpenedAt: string | null
  invitationOpenedAt: string | null
}

export type WizardProgress = {
  currentStep: WizardStepId
  completedSteps: WizardStepId[]
}

export type UserRole = 'platform_admin' | 'org_owner' | 'org_member'

export type Organization = {
  id: string
  name: string
  createdAt: string
}

export type PlatformUser = {
  id: string
  email: string
  name: string
  passwordHash: string
  role: UserRole
  orgId: string
  createdAt: string
}

export type PlatformEvent = {
  id: string
  orgId: string
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
  orgs: Organization[]
  users: PlatformUser[]
  events: PlatformEvent[]
  emailLogs?: EmailLog[]
}

export type EmailLog = {
  id: string
  eventId: string
  familyId: string | null
  type: string
  status: string
  resendId: string | null
  toEmail: string
  error: string
  sentAt: string
}
