import { createDefaultConfig } from './defaults'
import { uid } from './ids'
import type { EventConfig, Guest, Hotel, LocalPlace, PlaceCategory, PlatformEvent } from './types'
import { PLACE_CATEGORIES } from './types'
import { resolveLocales } from './locales'
import { normalizeMailDomain } from './mail-domain'

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
    mapUrl: row.mapUrl || '',
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
  }
}

export function normalizeGuest(row: Partial<Guest> & { familyName?: string }): Guest {
  return {
    id: row.id || uid(),
    familyName: row.familyName || '',
    email: row.email || '',
    partySize: Math.max(1, Number(row.partySize) || 1),
    status: row.status === 'yes' || row.status === 'no' ? row.status : 'pending',
    meal: row.meal || '',
    dietary: row.dietary || '',
    message: row.message || '',
    createdAt: row.createdAt || new Date().toISOString(),
    token: row.token || uid(),
    stdSentAt: row.stdSentAt ?? null,
    inviteSentAt: row.inviteSentAt ?? null,
  }
}

export function normalizeConfig(raw: EventConfig | null | undefined): EventConfig {
  const base = createDefaultConfig()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    basics: { ...base.basics, ...raw.basics },
    locales: resolveLocales(raw.locales?.enabled, raw.locales?.default),
    branding: { ...base.branding, ...raw.branding },
    story: { ...base.story, ...raw.story, honoreeBio: raw.story?.honoreeBio || '' },
    schedule: { items: raw.schedule?.items?.length ? raw.schedule.items : base.schedule.items },
    venues: {
      dressCode: raw.venues?.dressCode || '',
      parking: raw.venues?.parking || '',
      hotels: (raw.venues?.hotels || []).map((item) => hotel(item)),
    },
    places: (raw.places || []).map((item) => place(item)),
    contact: {
      phone: raw.contact?.phone || '',
      email: raw.contact?.email || '',
      whatsapp: raw.contact?.whatsapp || '',
    },
    media: { ...base.media, ...raw.media, gallery: raw.media?.gallery || [] },
    saveTheDate: { ...base.saveTheDate, ...raw.saveTheDate },
    invitation: { ...base.invitation, ...raw.invitation, sealImageUrl: raw.invitation?.sealImageUrl || '' },
    rsvp: { ...base.rsvp, ...raw.rsvp, meals: raw.rsvp?.meals || base.rsvp.meals },
    faq: { items: raw.faq?.items || [] },
    domain: {
      ...base.domain,
      ...raw.domain,
      mail: normalizeMailDomain(raw.domain?.mail),
    },
  }
}

export function normalizeEvent(event: PlatformEvent): PlatformEvent {
  return {
    ...event,
    previewToken: event.previewToken || uid(),
    config: normalizeConfig(event.config),
    guests: (event.guests || []).map((guest) => normalizeGuest(guest)),
  }
}
