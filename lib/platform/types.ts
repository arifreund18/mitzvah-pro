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
  'followUpSchedule',
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

export type HotelTravelMode = 'walk' | 'drive'

export type Hotel = {
  id: string
  name: string
  url: string
  notes: string
  /** Duration / notes, e.g. "8 min". Mode is `travelMode`. */
  walking: string
  /** How guests reach the venue from this hotel. Defaults to walk for legacy events. */
  travelMode: HotelTravelMode
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

/**
 * Shared STD + invitation card design (~50 keys × 2 surfaces ≈ inventário ~100).
 * Text overlays per locale live in `contentI18n.*.card` / `contentI18n.*.stdCard`.
 */
export type CardDesign = {
  // Page / envelope chrome
  pageColor: string
  pageTexture: string
  envelopeColor: string
  envelopeTexture: string
  envelopeLiner: string
  envelopeExterior: string
  envelopeNameColor: string
  sealUrl: string
  sealBg: string
  sealLabel: string
  openLabel: string
  forLabel: string
  fontKey: string
  // Card surface
  cardColor: string
  cardTextColor: string
  /** Text color for the RSVP button in the invite email. */
  ctaRsvpColor: string
  cardImageUrl: string
  /** CSS background-position for cardImageUrl, e.g. "50% 30%" or "center". */
  cardImagePosition: string
  // Typography
  greetingColor: string
  nameColor: string
  bodyColor: string
  introColor: string
  headingColor: string
  bodySizePx: number
  bodyBold: boolean
  bodyItalic: boolean
  introSizePx: number
  introBold: boolean
  introItalic: boolean
  headingSizePx: number
  headingBold: boolean
  headingItalic: boolean
  // Panel photo
  panelPhotoUrl: string
  panelPhotoShape: 'circle' | 'rectangle'
  /** CSS object-position for panel photo, e.g. "50% 30%" or "center". */
  panelPhotoPosition: string
  // Location / labels
  mapUrl: string
  address1: string
  address2: string
  timeLabel: string
  placeLabel: string
  cityLabel: string
  dateLabel: string
  // Card copy
  title: string
  eventName: string
  heading: string
  hosts: string
  message: string
  tip: string
  greeting: string
  intro: string
  // Email / CTA
  subject: string
  ctaView: string
  ctaCalendar: string
  ctaMap: string
  ctaRsvp: string
  rsvpLabel: string
  rsvpHint: string
  /** Comma-separated hex suggestions shown in the wizard. */
  suggestedPalette: string
}

/** @deprecated Prefer `EventProducts`. Kept as derived flag: site vs no-site. */
export type ProductMode = 'site' | 'invite_only'

/** Independent offerings the family can mix: website, invitation email, save-the-date. */
export type EventProducts = {
  site: boolean
  invitation: boolean
  saveTheDate: boolean
}

export type EventConfig = {
  /**
   * Multi-select of what this event includes. Drives wizard steps and sends.
   * Prefer this over `productMode`.
   */
  products: EventProducts
  /**
   * Derived from `products.site` for older callers.
   * `site` = includes website steps; `invite_only` = no website steps.
   */
  productMode: ProductMode
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
  /**
   * Per-locale overlays. Story fields fall back to `story.*`.
   * Entity maps are keyed by schedule/faq/hotel/place id.
   */
  contentI18n?: Partial<
    Record<
      EventLocale,
      {
        headline?: string
        subtitle?: string
        parentsMessage?: string
        about?: string
        honoreeBio?: string
        schedule?: Record<string, { title?: string; notes?: string; dressCode?: string; place?: string }>
        faq?: Record<string, { question?: string; answer?: string }>
        hotels?: Record<string, { name?: string; notes?: string }>
        places?: Record<string, { name?: string; notes?: string }>
        legal?: { privacyHtml?: string; termsHtml?: string; comingSoonMessage?: string }
        /** Invitation card text overlays */
        card?: Partial<
          Pick<
            CardDesign,
            | 'title'
            | 'eventName'
            | 'heading'
            | 'hosts'
            | 'message'
            | 'tip'
            | 'greeting'
            | 'intro'
            | 'subject'
            | 'ctaView'
            | 'ctaCalendar'
            | 'ctaMap'
            | 'ctaRsvp'
            | 'rsvpLabel'
            | 'rsvpHint'
            | 'openLabel'
            | 'forLabel'
            | 'sealLabel'
            | 'timeLabel'
            | 'placeLabel'
            | 'cityLabel'
            | 'dateLabel'
            | 'address1'
            | 'address2'
          >
        >
        /** Save-the-date card text overlays */
        stdCard?: Partial<
          Pick<
            CardDesign,
            | 'title'
            | 'eventName'
            | 'heading'
            | 'hosts'
            | 'message'
            | 'tip'
            | 'greeting'
            | 'intro'
            | 'subject'
            | 'ctaView'
            | 'ctaCalendar'
            | 'ctaMap'
            | 'ctaRsvp'
            | 'rsvpLabel'
            | 'rsvpHint'
            | 'openLabel'
            | 'forLabel'
            | 'sealLabel'
            | 'timeLabel'
            | 'placeLabel'
            | 'cityLabel'
            | 'dateLabel'
          >
        >
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
    /** RSVP confirmation email: title under the card (empty = omit the line). */
    confirmationEmailTitle: string
    /** RSVP confirmation email: hosts line (empty = omit the line). */
    confirmationEmailHosts: string
    /** RSVP confirmation email: body under hosts (empty = omit the line). */
    confirmationEmailBody: string
  }
  reminders: {
    enabled: boolean
    d30: boolean
    d7: boolean
    d2: boolean
    /** Who receives the D-30 reminder. */
    audienceD30: ReminderAudience
    /** Who receives the D-7 reminder. */
    audienceD7: ReminderAudience
    /** Who receives the D-2 reminder. */
    audienceD2: ReminderAudience
    /**
     * @deprecated Prefer audienceD7 / audienceD2. Kept for normalize migration.
     * When true (legacy default), D-7/D-2 were confirmed-only; D-30 was always all.
     */
    onlyConfirmedForD7D2?: boolean
    message: string
  }
  /**
   * Automatic scheduled follow-up emails (D-30 / D-7 / D-2), independent of
   * `reminders` — own enable toggle and message body. Uses the "message"
   * follow-up email layout (not the reminder card layout).
   */
  followUpSchedule: ScheduledGuestMailConfig
  /**
   * Host→guest follow-up broadcasts (reminder / message / update).
   * Stored on config so relational dual-write (config JSONB) keeps them.
   */
  followUps: HostFollowUp[]
  faq: { items: FaqItem[] }
  legal: {
    privacyHtml: string
    termsHtml: string
    comingSoon: boolean
    comingSoonMessage: string
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

/** Host broadcast email kinds (manual follow-up, not cron reminders). */
export type HostFollowUpType = 'reminder' | 'message' | 'update'

/** Who receives a follow-up send. */
export type HostFollowUpAudience = 'all' | 'yes' | 'pending' | 'no'

export type HostFollowUp = {
  id: string
  type: HostFollowUpType
  /** Plain-text body written by the host. */
  body: string
  /** Optional subject override; empty uses the type default. */
  subject: string
  audience: HostFollowUpAudience
  /** When set, only these family ids are targeted (overrides audience filter). */
  guestIds: string[]
  /** Client idempotency key — duplicate POSTs replay the same campaign. */
  clientRequestId?: string
  createdAt: string
  sentAt: string | null
  sentCount: number
  failedCount: number
  deferredCount: number
}

export type MailDomainStatus = 'skipped' | 'pending' | 'verified' | 'failed'

export type EventMailDomain = {
  sendingDomain: string
  fromEmail: string
  resendDomainId: string
  /** SES configuration set for this event (e.g. mitzvah-{slug}). */
  configurationSetName?: string
  status: MailDomainStatus
  lastError: string
  verifiedAt: string | null
}

export type GuestRsvp = 'pending' | 'yes' | 'no'

/** Audience filter for automatic reminder windows (D-30 / D-7 / D-2). */
export type ReminderAudience = 'all' | 'yes' | 'pending'

/** Shared shape for scheduled guest email campaigns (reminders / follow-up schedule). */
export type ScheduledGuestMailConfig = {
  enabled: boolean
  d30: boolean
  d7: boolean
  d2: boolean
  audienceD30: ReminderAudience
  audienceD7: ReminderAudience
  audienceD2: ReminderAudience
  message: string
}

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
  /** When role is org_member, only these events are visible/editable. Owners ignore this. */
  eventIds: string[]
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

export type MailJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type MailJob = {
  id: string
  eventId: string
  kind: 'std' | 'invite'
  status: MailJobStatus
  guestIds: string[]
  pendingGuestIds: string[]
  /** Guests held for later (throttle / unverified / daily cap) — not lost. */
  deferredGuestIds?: string[]
  /**
   * Batch claimed by a worker but not yet finalized. Recovered into pending
   * if the worker dies (stale lease).
   */
  inFlightGuestIds?: string[]
  processed: number
  succeeded: number
  failed: number
  deferred?: number
  errors: string[]
  host: string
  from: string
  configurationSetName?: string
  createdAt: string
  updatedAt: string
  attempts: number
  lastError: string
}

export type PlatformStore = {
  orgs: Organization[]
  users: PlatformUser[]
  events: PlatformEvent[]
  emailLogs?: EmailLog[]
  mailJobs?: MailJob[]
  /** E8: slugs of deleted/renamed events — not reusable (mail identity / config set). */
  retiredSlugs?: string[]
}

export type EmailLog = {
  id: string
  eventId: string
  familyId: string | null
  type: string
  status: string
  /** Provider message id (SES MessageId or Resend id). */
  messageId: string | null
  /**
   * @deprecated Alias of messageId — kept so older JSON/rows and dual-write keep working.
   * Always equal to messageId when loaded from storage.
   */
  resendId: string | null
  toEmail: string
  error: string
  sentAt: string
}
