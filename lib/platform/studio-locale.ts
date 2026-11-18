import type { EventLocale } from './types.ts'
import { EVENT_LOCALES } from './types.ts'

export const STUDIO_LOCALE_COOKIE = 'mitzvah_studio_locale'

export function asStudioLocale(value: string | null | undefined): EventLocale | null {
  const raw = String(value || '').trim().toLowerCase()
  if ((EVENT_LOCALES as readonly string[]).includes(raw)) return raw as EventLocale
  return null
}

/** Prefer explicit studio cookie, then Accept-Language, then English. */
export function resolveStudioLocale(input: {
  cookie?: string | null
  acceptLanguage?: string | null
  eventDefault?: EventLocale | null
}): EventLocale {
  const fromCookie = asStudioLocale(input.cookie)
  if (fromCookie) return fromCookie
  if (input.eventDefault) return input.eventDefault
  const header = String(input.acceptLanguage || '')
  for (const part of header.split(',')) {
    const tag = part.trim().split(';')[0]?.trim().toLowerCase() || ''
    const short = tag.slice(0, 2)
    const hit = asStudioLocale(short)
    if (hit) return hit
  }
  return 'en'
}
