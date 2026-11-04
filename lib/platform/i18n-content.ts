import type { CardDesign, EventConfig, EventLocale, FaqItem, Hotel, LocalPlace, ScheduleItem } from './types'

export type StoryI18nFields = {
  headline?: string
  subtitle?: string
  parentsMessage?: string
  about?: string
  honoreeBio?: string
}

export type ContentI18n = NonNullable<EventConfig['contentI18n']>
export type LocaleOverlay = NonNullable<ContentI18n[EventLocale]>

export type StoryFieldKey = keyof StoryI18nFields

/** Resolve a story field: contentI18n[locale] overlay, else story base. */
export function getLocalized(
  config: EventConfig,
  locale: EventLocale,
  path: StoryFieldKey,
): string {
  const overlay = config.contentI18n?.[locale]?.[path]
  if (overlay != null && overlay !== '') return overlay
  return config.story[path] || ''
}

/** Full story object with locale overlays applied. */
export function getLocalizedStory(
  config: EventConfig,
  locale: EventLocale,
): EventConfig['story'] {
  return {
    headline: getLocalized(config, locale, 'headline'),
    subtitle: getLocalized(config, locale, 'subtitle'),
    parentsMessage: getLocalized(config, locale, 'parentsMessage'),
    about: getLocalized(config, locale, 'about'),
    honoreeBio: getLocalized(config, locale, 'honoreeBio'),
  }
}

export function getLocalizedScheduleItem(
  config: EventConfig,
  locale: EventLocale,
  item: ScheduleItem,
): ScheduleItem {
  const overlay = config.contentI18n?.[locale]?.schedule?.[item.id]
  if (!overlay) return item
  return {
    ...item,
    title: overlay.title || item.title,
    notes: overlay.notes || item.notes,
    dressCode: overlay.dressCode || item.dressCode,
    place: overlay.place || item.place,
  }
}

export function getLocalizedFaqItem(
  config: EventConfig,
  locale: EventLocale,
  item: FaqItem,
): FaqItem {
  const overlay = config.contentI18n?.[locale]?.faq?.[item.id]
  if (!overlay) return item
  return {
    ...item,
    question: overlay.question || item.question,
    answer: overlay.answer || item.answer,
  }
}

export function getLocalizedHotel(
  config: EventConfig,
  locale: EventLocale,
  hotel: Hotel,
): Hotel {
  const overlay = config.contentI18n?.[locale]?.hotels?.[hotel.id]
  if (!overlay) return hotel
  return {
    ...hotel,
    name: overlay.name || hotel.name,
    notes: overlay.notes || hotel.notes,
  }
}

export function getLocalizedPlace(
  config: EventConfig,
  locale: EventLocale,
  place: LocalPlace,
): LocalPlace {
  const overlay = config.contentI18n?.[locale]?.places?.[place.id]
  if (!overlay) return place
  return {
    ...place,
    name: overlay.name || place.name,
    notes: overlay.notes || place.notes,
  }
}

export function getLocalizedLegal(
  config: EventConfig,
  locale: EventLocale,
): EventConfig['legal'] {
  const overlay = config.contentI18n?.[locale]?.legal
  return {
    privacyHtml: overlay?.privacyHtml || config.legal.privacyHtml,
    termsHtml: overlay?.termsHtml || config.legal.termsHtml,
    comingSoon: config.legal.comingSoon,
    comingSoonMessage: overlay?.comingSoonMessage || config.legal.comingSoonMessage || '',
  }
}

export function getLocalizedCardDesign(
  config: EventConfig,
  locale: EventLocale,
  kind: 'std' | 'invite',
): CardDesign {
  const base = kind === 'std' ? config.saveTheDate.design : config.invitation.design
  const overlay =
    kind === 'std'
      ? config.contentI18n?.[locale]?.stdCard
      : config.contentI18n?.[locale]?.card
  return { ...base, ...overlay }
}

export function emptyContentI18n(): ContentI18n {
  return {}
}
