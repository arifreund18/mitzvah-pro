import type { CardDesign, EventConfig, EventLocale, Guest } from './types.ts'

/** Prefer the guest's invite language, then the event default. */
export function guestDisplayLocale(guest: Guest | null | undefined, config: EventConfig): EventLocale {
  return guest?.inviteLocale || config.locales.default || 'pt'
}

type ChromeCtaKey = 'ctaView' | 'ctaCalendar' | 'ctaMap' | 'ctaRsvp' | 'rsvpLabel'

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
  const fromOverlay = overlay?.[key]?.trim()
  if (fromOverlay) return fromOverlay

  if (locale === config.locales.default) {
    const base = kind === 'std' ? config.saveTheDate.design : config.invitation.design
    const fromBase = base[key]?.trim()
    if (fromBase) return fromBase
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
