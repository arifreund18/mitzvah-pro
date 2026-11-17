import type { CardDesign, EventConfig, EventLocale, Guest } from './types.ts'
import { EVENT_LOCALES } from './types.ts'

type InviteChromeCtaKey = 'ctaView' | 'ctaCalendar' | 'ctaMap' | 'ctaRsvp' | 'rsvpLabel' | 'openLabel'
type StdChromeCtaKey = 'ctaView' | 'ctaCalendar' | 'ctaMap' | 'openLabel'
export type ChromeCtaKey = InviteChromeCtaKey | StdChromeCtaKey

/** Known stock chrome strings per locale — used to detect cross-locale leaks in base design. */
export const SYSTEM_CHROME: Record<EventLocale, Partial<Record<ChromeCtaKey, string[]>>> = {
  en: {
    ctaView: ['VIEW THE INVITATION', 'VIEW THE CARD', 'Open invitation', 'View the event website'],
    ctaCalendar: ['Add to calendar'],
    ctaMap: ['View map', 'Map'],
    ctaRsvp: ['Confirm attendance', 'RSVP now', 'RSVP'],
    rsvpLabel: ['Confirm attendance', 'RSVP now', 'RSVP'],
    openLabel: ['Open invitation', 'Open save the date', 'Open envelope'],
  },
  pt: {
    ctaView: ['VER O CONVITE', 'Abrir convite', 'Ver o site do evento'],
    ctaCalendar: ['Adicionar ao calendário'],
    ctaMap: ['Ver mapa', 'Mapa'],
    ctaRsvp: ['Confirmar presença', 'RSVP'],
    rsvpLabel: ['Confirmar presença', 'RSVP'],
    openLabel: ['Abrir convite', 'Abrir save the date', 'Abrir envelope'],
  },
  es: {
    ctaView: ['VER LA INVITACIÓN', 'Abrir invitación', 'Ver el sitio del evento'],
    ctaCalendar: ['Añadir al calendario'],
    ctaMap: ['Ver mapa', 'Mapa'],
    ctaRsvp: ['Confirmar asistencia', 'RSVP'],
    rsvpLabel: ['Confirmar asistencia', 'RSVP'],
    openLabel: ['Abrir invitación', 'Abrir save the date', 'Abrir sobre'],
  },
  he: {
    ctaView: ['לצפייה בהזמנה', 'לצפייה בכרטיס', 'פתחו את ההזמנה', 'לאתר האירוע'],
    ctaCalendar: ['הוסיפו ליומן', 'הוספה ליומן'],
    ctaMap: ['מפה', 'View map'],
    ctaRsvp: ['אישור הגעה', 'RSVP'],
    rsvpLabel: ['אישור הגעה', 'RSVP'],
    openLabel: ['פתחו את ההזמנה', 'פתחו את Save the Date', 'פתיחת מעטפה'],
  },
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function enabledLocales(config: EventConfig): EventLocale[] {
  const enabled = (config.locales.enabled || []).filter((item): item is EventLocale =>
    (EVENT_LOCALES as readonly string[]).includes(item),
  )
  if (enabled.length) return enabled
  const fallback = config.locales.default || 'pt'
  return [fallback]
}

export function primaryEventLocale(config: EventConfig): EventLocale {
  const enabled = enabledLocales(config)
  if (enabled.length === 1) return enabled[0]!
  if (enabled.includes(config.locales.default)) return config.locales.default
  return enabled[0] || 'pt'
}

/**
 * Locale for guest-facing surfaces.
 * Mono-locale events always use that locale (even if guest.inviteLocale is stale).
 */
export function resolveGuestLocale(
  guest: Guest | null | undefined,
  config: EventConfig,
  explicit?: EventLocale | null,
): EventLocale {
  const enabled = enabledLocales(config)
  if (explicit && enabled.includes(explicit)) return explicit
  if (enabled.length === 1) return enabled[0]!
  if (guest?.inviteLocale && enabled.includes(guest.inviteLocale)) return guest.inviteLocale
  return primaryEventLocale(config)
}

/** @deprecated use resolveGuestLocale */
export function guestDisplayLocale(guest: Guest | null | undefined, config: EventConfig): EventLocale {
  return resolveGuestLocale(guest, config)
}

function overlayValue(
  overlay: Partial<Record<string, string>> | undefined,
  key: string,
): string {
  const value = overlay?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** True when `text` is a stock chrome string belonging to a different locale. */
export function isForeignSystemChrome(
  text: string,
  locale: EventLocale,
  key: ChromeCtaKey,
): boolean {
  const needle = norm(text)
  if (!needle) return false
  // Shared tokens like "RSVP" / "Map" appear in multiple packs — keep them for the active locale.
  const own = SYSTEM_CHROME[locale][key] || []
  if (own.some((item) => norm(item) === needle)) return false
  for (const loc of EVENT_LOCALES) {
    if (loc === locale) continue
    const values = SYSTEM_CHROME[loc][key] || []
    if (values.some((item) => norm(item) === needle)) return true
  }
  return false
}

/**
 * Resolve invite/STD chrome CTA copy for a locale.
 * 1) contentI18n overlay for that locale
 * 2) base design CTA only if it is not a stock string from another locale
 * 3) system fallback for the active locale
 */
export function chromeCtaText(
  config: EventConfig,
  locale: EventLocale,
  kind: 'std' | 'invite',
  key: ChromeCtaKey,
  fallback: string,
): string {
  const overlay =
    kind === 'std'
      ? config.contentI18n?.[locale]?.stdCard
      : config.contentI18n?.[locale]?.card
  const fromOverlay = overlayValue(overlay as Partial<Record<string, string>> | undefined, key)
  if (fromOverlay) {
    if (!isForeignSystemChrome(fromOverlay, locale, key)) return fromOverlay
  }

  const base = kind === 'std' ? config.saveTheDate.design : config.invitation.design
  const fromBase = (base as Record<string, unknown>)[key]
  if (typeof fromBase === 'string' && fromBase.trim()) {
    const trimmed = fromBase.trim()
    if (!isForeignSystemChrome(trimmed, locale, key)) return trimmed
  }

  return fallback
}

export function inviteRsvpLabel(
  config: EventConfig,
  locale: EventLocale,
  design: CardDesign,
  fallback: string,
): string {
  void design
  return (
    chromeCtaText(config, locale, 'invite', 'rsvpLabel', '') ||
    chromeCtaText(config, locale, 'invite', 'ctaRsvp', '') ||
    fallback
  )
}

export function localizedOpenLabel(
  config: EventConfig,
  locale: EventLocale,
  kind: 'std' | 'invite',
  fallback: string,
): string {
  return chromeCtaText(config, locale, kind, 'openLabel', fallback)
}

const CHROME_KEYS: ChromeCtaKey[] = [
  'ctaView',
  'ctaCalendar',
  'ctaMap',
  'ctaRsvp',
  'rsvpLabel',
  'openLabel',
]

/** Clear base-design chrome fields that are stock strings from a foreign locale. */
export function scrubForeignChromeFromDesign(
  design: CardDesign,
  locale: EventLocale,
): CardDesign {
  const next: CardDesign = { ...design }
  for (const key of CHROME_KEYS) {
    const value = next[key]
    if (typeof value === 'string' && isForeignSystemChrome(value, locale, key)) {
      next[key] = ''
    }
  }
  return next
}

/** Align guest inviteLocale to the event's enabled languages (mono-locale safe). */
export function coerceGuestInviteLocale(guest: Guest, config: EventConfig): Guest {
  const locale = resolveGuestLocale(guest, config)
  if (guest.inviteLocale === locale) return guest
  return { ...guest, inviteLocale: locale }
}
