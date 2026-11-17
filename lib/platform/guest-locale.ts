import type { CardDesign, EventConfig, EventLocale, Guest } from './types.ts'

/** Prefer the guest's invite language, then the event default. */
export function guestDisplayLocale(guest: Guest | null | undefined, config: EventConfig): EventLocale {
  return guest?.inviteLocale || config.locales.default || 'pt'
}

type InviteChromeCtaKey = 'ctaView' | 'ctaCalendar' | 'ctaMap' | 'ctaRsvp' | 'rsvpLabel' | 'openLabel'
type StdChromeCtaKey = 'ctaView' | 'ctaCalendar' | 'ctaMap' | 'openLabel'
type ChromeCtaKey = InviteChromeCtaKey | StdChromeCtaKey

function overlayValue(
  overlay: Partial<Record<string, string>> | undefined,
  key: string,
): string {
  const value = overlay?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Resolve invite/STD chrome CTA copy for a locale.
 * Overlay text wins; base design CTAs only apply for the event default locale
 * (otherwise a PT base CTA leaks onto EN guests).
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
  if (fromOverlay) return fromOverlay

  if (locale === config.locales.default) {
    const base = kind === 'std' ? config.saveTheDate.design : config.invitation.design
    const fromBase = (base as Record<string, unknown>)[key]
    if (typeof fromBase === 'string' && fromBase.trim()) return fromBase.trim()
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

/** Envelope open label: locale-safe (no PT custom openLabel on EN guests). */
export function localizedOpenLabel(
  config: EventConfig,
  locale: EventLocale,
  kind: 'std' | 'invite',
  fallback: string,
): string {
  return chromeCtaText(config, locale, kind, 'openLabel', fallback)
}
