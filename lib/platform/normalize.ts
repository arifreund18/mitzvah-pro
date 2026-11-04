import { createDefaultConfig, defaultCardDesign } from './defaults'
import { uid } from './ids'
import { familyToken } from './tokens'
import { DEFAULT_ORG_ID } from './auth'
import type {
  ContactPerson,
  EventConfig,
  EventLocale,
  FaqItem,
  GalleryItem,
  Guest,
  GuestPerson,
  GuestRsvp,
  Hotel,
  LocalPlace,
  PlaceCategory,
  PlatformEvent,
  ScheduleInviteMode,
  ScheduleItem,
} from './types'
import { EVENT_LOCALES, PLACE_CATEGORIES, SCHEDULE_INVITE_MODES } from './types'
import { resolveLocales } from './locales'
import { normalizeMailDomain } from './mail-domain'

function asPlaceCategory(value: string | undefined): PlaceCategory {
  if (value && (PLACE_CATEGORIES as readonly string[]).includes(value)) return value as PlaceCategory
  return 'other'
}

function asLocale(value: string | undefined, fallback: EventLocale): EventLocale {
  if (value && (EVENT_LOCALES as readonly string[]).includes(value)) return value as EventLocale
  return fallback
}

function asScheduleMode(value: string | undefined): ScheduleInviteMode {
  if (value && (SCHEDULE_INVITE_MODES as readonly string[]).includes(value)) {
    return value as ScheduleInviteMode
  }
  return 'all'
}

function asRsvp(value: string | undefined): GuestRsvp {
  return value === 'yes' || value === 'no' ? value : 'pending'
}

function hotel(row: Partial<Hotel> & { name?: string }): Hotel {
  return {
    id: row.id || uid(),
    name: row.name || '',
    url: row.url || '',
    notes: row.notes || '',
    walking: row.walking || '',
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

function aggregateStatus(people: GuestPerson[]): GuestRsvp {
  if (!people.length) return 'pending'
  if (people.every((p) => p.status === 'no')) return 'no'
  if (people.some((p) => p.status === 'yes')) return 'yes'
  if (people.every((p) => p.status === 'pending')) return 'pending'
  return 'pending'
}

export function normalizePerson(row: Partial<GuestPerson> & { name?: string }): GuestPerson {
  return {
    id: row.id || uid(),
    name: row.name || '',
    type: row.type === 'child' ? 'child' : 'adult',
    status: asRsvp(row.status),
    meal: row.meal || '',
    dietary: row.dietary || '',
  }
}

export function normalizeGuest(row: Partial<Guest> & { familyName?: string }): Guest {
  const emailsRaw = Array.isArray(row.emails) ? row.emails : []
  const primary = (row.email || emailsRaw[0] || '').trim()
  const emails = Array.from(
    new Set([primary, ...emailsRaw.map((e) => String(e).trim())].filter(Boolean)),
  )
  let people = Array.isArray(row.people)
    ? row.people.map((p) => normalizePerson(p))
    : []
  if (!people.length) {
    const size = Math.max(1, Number(row.partySize) || 1)
    people = Array.from({ length: size }, (_, i) =>
      normalizePerson({
        name: i === 0 ? row.familyName || 'Guest' : `${row.familyName || 'Guest'} ${i + 1}`,
        type: 'adult',
        status: asRsvp(row.status),
        meal: row.meal || '',
        dietary: row.dietary || '',
      }),
    )
  }
  const status = people.length ? aggregateStatus(people) : asRsvp(row.status)
  return {
    id: row.id || uid(),
    familyName: row.familyName || '',
    email: emails[0] || '',
    emails,
    partySize: people.length || Math.max(1, Number(row.partySize) || 1),
    status,
    meal: row.meal || people[0]?.meal || '',
    dietary: row.dietary || people[0]?.dietary || '',
    message: row.message || '',
    createdAt: row.createdAt || new Date().toISOString(),
    token: row.token || familyToken(),
    inviteLocale: asLocale(row.inviteLocale, 'pt'),
    scheduleInviteMode: asScheduleMode(row.scheduleInviteMode),
    scheduleItemIds: Array.isArray(row.scheduleItemIds) ? row.scheduleItemIds.map(String) : [],
    openRsvp: Boolean(row.openRsvp),
    notes: row.notes || '',
    people,
    stdSentAt: row.stdSentAt ?? null,
    inviteSentAt: row.inviteSentAt ?? null,
    stdOpenedAt: row.stdOpenedAt ?? null,
    invitationOpenedAt: row.invitationOpenedAt ?? null,
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

  return {
    ...base,
    ...raw,
    basics: {
      ...base.basics,
      ...raw.basics,
      startTime: raw.basics?.startTime || base.basics.startTime,
    },
    locales: resolveLocales(raw.locales?.enabled, raw.locales?.default),
    branding: { ...base.branding, ...raw.branding },
    story: { ...base.story, ...raw.story, honoreeBio: raw.story?.honoreeBio || '' },
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
    },
    reminders: { ...base.reminders, ...raw.reminders },
    faq: { items: (raw.faq?.items || []).map((item) => faqItem(item)) },
    legal: { ...base.legal, ...raw.legal },
    domain: {
      ...base.domain,
      ...raw.domain,
      mail: normalizeMailDomain(raw.domain?.mail),
      customHost: (raw.domain?.customHost || '').toLowerCase().replace(/^www\./, '').replace(/\/$/, ''),
      customHostStatus: raw.domain?.customHostStatus || 'none',
      customHostToken: raw.domain?.customHostToken || uid(),
    },
  }
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
        'guestsBootstrap',
        'legal',
        'domain',
        'review',
      ] as string[]
    ).includes(step),
  )
  return {
    ...event,
    previewToken: event.previewToken || uid(),
    approvalToken: event.approvalToken || uid(),
    orgId: event.orgId || DEFAULT_ORG_ID,
    config: normalizeConfig(event.config),
    guests: (event.guests || []).map((guest) => normalizeGuest(guest)),
    wizard: {
      currentStep: event.wizard?.currentStep || 'basics',
      completedSteps: completed as PlatformEvent['wizard']['completedSteps'],
    },
  }
}
