import type { EventConfig, EventLocale } from './types'

export type StoryI18nFields = {
  headline?: string
  subtitle?: string
  parentsMessage?: string
  about?: string
  honoreeBio?: string
}

export type ContentI18n = Partial<Record<EventLocale, StoryI18nFields>>

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

export function emptyContentI18n(): ContentI18n {
  return {}
}
