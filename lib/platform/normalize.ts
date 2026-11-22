import { createDefaultConfig, defaultCardDesign } from './defaults'
import {
  coerceGuestInviteLocale,
  primaryEventLocale,
  scrubForeignChromeFromDesign,
} from './guest-locale.ts'
import { uid } from './ids'
import { DEFAULT_ORG_ID } from './constants'
import { normalizeFollowUps } from './follow-up.ts'
import { isReminderAudience, resolveReminderAudience } from './reminder-audience.ts'
import {
  DEFAULT_FOLLOW_UP_SCHEDULE,
  normalizeScheduledGuestMail,
} from './scheduled-guest-mail.ts'
import type {
  ContactPerson,
  EventConfig,
  FaqItem,
  GalleryItem,
  Hotel,
  LocalPlace,
  PlaceCategory,
  PlatformEvent,
  ReminderAudience,
  ScheduleItem,
} from './types'
import { PLACE_CATEGORIES } from './types'
import { resolveLocales } from './locales'
import { normalizeMailDomain } from './mail-domain'
import { normalizeGuest } from './normalize-guest.ts'
import { normalizeProducts, productModeFrom } from './products'

export { normalizeGuest, normalizePerson } from './normalize-guest.ts'

function asPlaceCategory(value: string | undefined): PlaceCategory {
  if (value && (PLACE_CATEGORIES as readonly string[]).includes(value)) return value as PlaceCategory
  return 'other'
}

function hotel(row: Partial<Hotel> & { name?: string }): Hotel {
  return {
    id: row.id || uid(),
    name: row.name || '',
    url: row.url || '',
    notes: row.notes || '',
    walking: row.walking || '',
    travelMode: row.travelMode === 'drive' ? 'drive' : 'walk',
    mapUrl: row.mapUrl || '',
    photoUrl: row.photoUrl || '',
    stars: Math.max(0, Math.min(5, Number(row.stars) || 0)),
    featured: Boolean(row.featured),
    bookUrl: row.bookUrl || '',
  }
}

function place(row: Partial<LocalPlace> & { name?: string }): LocalPlace {
  return {
    id: row.id || uid(),
    name: row.name || '',
    category: asPlaceCategory(row.category),
    url: row.url || '',
    mapUrl: row.mapUrl || '',
    notes: row.notes || '',
    photoUrl: row.photoUrl || '',
  }
}

function scheduleItem(row: Partial<ScheduleItem>): ScheduleItem {
  return {
    id: row.id || uid(),
    title: row.title || '',
    time: row.time || '',
    timeEnd: row.timeEnd || '',
    date: row.date || '',
    place: row.place || '',
    address: row.address || '',
    mapUrl: row.mapUrl || '',
    dressCode: row.dressCode || '',
    notes: row.notes || '',
    dayLabel: row.dayLabel || '',
    visibility: row.visibility === 'invite' ? 'invite' : 'public',
  }
}

function faqItem(row: Partial<FaqItem>): FaqItem {
  return {
    id: row.id || uid(),
    question: row.question || '',
    answer: row.answer || '',
    published: row.published !== false,
  }
}

function normalizeReminders(
  raw: EventConfig['reminders'] | null | undefined,
  base: EventConfig['reminders'],
): EventConfig['reminders'] {
  const merged = { ...base, ...(raw || {}) }
  const legacy = {
    audienceD30: raw?.audienceD30,
    audienceD7: raw?.audienceD7,
    audienceD2: raw?.audienceD2,
    onlyConfirmedForD7D2: raw?.onlyConfirmedForD7D2 ?? base.onlyConfirmedForD7D2,
  }
  const audienceD30: ReminderAudience = isReminderAudience(raw?.audienceD30)
    ? raw!.audienceD30
    : resolveReminderAudience(30, legacy)
  const audienceD7: ReminderAudience = isReminderAudience(raw?.audienceD7)
    ? raw!.audienceD7
    : resolveReminderAudience(7, legacy)
  const audienceD2: ReminderAudience = isReminderAudience(raw?.audienceD2)
    ? raw!.audienceD2
    : resolveReminderAudience(2, legacy)
  return {
    enabled: Boolean(merged.enabled),
    d30: Boolean(merged.d30),
    d7: Boolean(merged.d7),
    d2: Boolean(merged.d2),
    audienceD30,
    audienceD7,
    audienceD2,
    message: String(merged.message || ''),
  }
}

function contactPerson(row: Partial<ContactPerson>): ContactPerson {
  return {
    id: row.id || uid(),
    name: row.name || '',
    phone: row.phone || '',
    email: row.email || '',
    whatsapp: row.whatsapp || '',
    whatsappLabel: row.whatsappLabel || '',
  }
}

function galleryItem(row: Partial<GalleryItem> & { url?: string }, index: number): GalleryItem {
  return {
    id: row.id || uid(),
    url: row.url || '',
    type: row.type === 'video' ? 'video' : 'image',
    caption: row.caption || '',
    approved: row.approved !== false,
    showOnSite: row.showOnSite !== false,
    sortOrder: Number.isFinite(row.sortOrder) ? Number(row.sortOrder) : index,
  }
}

export function normalizeConfig(raw: EventConfig | null | undefined): EventConfig {
  const base = createDefaultConfig()
  if (!raw) return base
  const legacyGallery = raw.media?.gallery || []
  const galleryItems = (raw.media?.galleryItems?.length
    ? raw.media.galleryItems
    : legacyGallery.map((url, i) => ({ url, sortOrder: i }))
  ).map((item, i) => galleryItem(item, i))

  const people =
    raw.contact?.people?.length
      ? raw.contact.people.map((p) => contactPerson(p))
      : raw.contact?.phone || raw.contact?.email || raw.contact?.whatsapp
        ? [
            contactPerson({
              phone: raw.contact.phone,
              email: raw.contact.email,
              whatsapp: raw.contact.whatsapp,
            }),
          ]
        : []

  const products = normalizeProducts(raw.products, raw.productMode, raw.saveTheDate?.enabled)
  const locales = resolveLocales(raw.locales?.enabled, raw.locales?.default)

  const config: EventConfig = {
    ...base,
    ...raw,
    products,
    productMode: productModeFrom(products),
    basics: {
      ...base.basics,
      ...raw.basics,
      startTime: raw.basics?.startTime || base.basics.startTime,
    },
    locales,
    branding: { ...base.branding, ...raw.branding },
    story: { ...base.story, ...raw.story, honoreeBio: raw.story?.honoreeBio || '' },
    contentI18n: raw.contentI18n && typeof raw.contentI18n === 'object' ? raw.contentI18n : {},
    schedule: {
      items: (raw.schedule?.items?.length ? raw.schedule.items : base.schedule.items).map((item) =>
        scheduleItem(item),
      ),
    },
    venues: {
      dressCode: raw.venues?.dressCode || '',
      parking: raw.venues?.parking || '',
      hotels: (raw.venues?.hotels || []).map((item) => hotel(item)),
    },
    places: (raw.places || []).map((item) => place(item)),
    contact: {
      phone: raw.contact?.phone || people[0]?.phone || '',
      email: raw.contact?.email || people[0]?.email || '',
      whatsapp: raw.contact?.whatsapp || people[0]?.whatsapp || '',
      people,
      formEnabled: raw.contact?.formEnabled ?? base.contact.formEnabled,
    },
    travel: { ...base.travel, ...raw.travel },
    media: {
      heroUrl: raw.media?.heroUrl || '',
      gallery: galleryItems.filter((g) => g.type === 'image' && g.showOnSite).map((g) => g.url),
      galleryItems,
      ambientAudioUrl: raw.media?.ambientAudioUrl || '',
    },
    saveTheDate: {
      ...base.saveTheDate,
      ...raw.saveTheDate,
      enabled: products.saveTheDate,
      design: { ...defaultCardDesign(), ...base.saveTheDate.design, ...raw.saveTheDate?.design },
    },
    invitation: {
      ...base.invitation,
      ...raw.invitation,
      sealImageUrl: raw.invitation?.sealImageUrl || '',
      intro: raw.invitation?.intro || '',
      design: { ...defaultCardDesign(), ...base.invitation.design, ...raw.invitation?.design },
    },
    rsvp: {
      ...base.rsvp,
      ...raw.rsvp,
      meals: raw.rsvp?.meals || base.rsvp.meals,
      collectMeal: raw.rsvp?.collectMeal ?? true,
      publicFormEnabled: raw.rsvp?.publicFormEnabled ?? false,
      openRsvpDefault: raw.rsvp?.openRsvpDefault ?? false,
      notifyMode: raw.rsvp?.notifyMode || 'instant',
      notifyEmails: raw.rsvp?.notifyEmails || [],
      confirmationMessage: raw.rsvp?.confirmationMessage || base.rsvp.confirmationMessage,
      confirmationEmailTitle: raw.rsvp?.confirmationEmailTitle ?? base.rsvp.confirmationEmailTitle ?? '',
      confirmationEmailHosts: raw.rsvp?.confirmationEmailHosts ?? base.rsvp.confirmationEmailHosts ?? '',
      confirmationEmailBody: raw.rsvp?.confirmationEmailBody ?? base.rsvp.confirmationEmailBody ?? '',
      confirmationEmailWebsiteCta:
        raw.rsvp?.confirmationEmailWebsiteCta ?? base.rsvp.confirmationEmailWebsiteCta ?? '',
    },
    reminders: normalizeReminders(raw.reminders, base.reminders),
    followUpSchedule: normalizeScheduledGuestMail(
      raw.followUpSchedule,
      base.followUpSchedule || DEFAULT_FOLLOW_UP_SCHEDULE,
    ),
    followUps: normalizeFollowUps(raw.followUps),
    faq: { items: (raw.faq?.items || []).map((item) => faqItem(item)) },
    legal: {
      ...base.legal,
      ...raw.legal,
      comingSoonMessage: raw.legal?.comingSoonMessage || base.legal.comingSoonMessage || '',
    },
    domain: {
      ...base.domain,
      ...raw.domain,
      mail: normalizeMailDomain(raw.domain?.mail),
      customHost: (raw.domain?.customHost || '').toLowerCase().replace(/^www\./, '').replace(/\/$/, ''),
      customHostStatus: raw.domain?.customHostStatus || 'none',
      customHostToken: raw.domain?.customHostToken || uid(),
    },
  }

  // Drop leftover PT/ES/HE stock CTAs when the event primary language is EN (and vice-versa).
  const chromeLocale = primaryEventLocale(config)
  config.invitation = {
    ...config.invitation,
    design: scrubForeignChromeFromDesign(config.invitation.design, chromeLocale),
  }
  config.saveTheDate = {
    ...config.saveTheDate,
    design: scrubForeignChromeFromDesign(config.saveTheDate.design, chromeLocale),
  }
  return config
}

export function normalizeEvent(event: PlatformEvent): PlatformEvent {
  const completed = (event.wizard?.completedSteps || []).filter((step) =>
    (
      [
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
      ] as string[]
    ).includes(step),
  )
  const config = normalizeConfig(event.config)
  return {
    ...event,
    previewToken: event.previewToken || uid(),
    approvalToken: event.approvalToken || uid(),
    orgId: event.orgId || DEFAULT_ORG_ID,
    config,
    guests: (event.guests || []).map((guest) =>
      coerceGuestInviteLocale(
        normalizeGuest(guest, { inviteLocale: primaryEventLocale(config) }),
        config,
      ),
    ),
    wizard: {
      currentStep: event.wizard?.currentStep || 'basics',
      completedSteps: completed as PlatformEvent['wizard']['completedSteps'],
    },
  }
}
