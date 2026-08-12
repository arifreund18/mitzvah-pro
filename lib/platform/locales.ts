import { EVENT_LOCALES, type EventLocale } from './types'

export const LOCALE_OPTIONS: { value: EventLocale; label: string; hint: string }[] = [
  { value: 'en', label: 'English', hint: 'US' },
  { value: 'pt', label: 'Português', hint: 'BR' },
  { value: 'es', label: 'Español', hint: 'MX' },
  { value: 'he', label: 'עברית', hint: 'IL' },
]

export function isEventLocale(value: string | undefined | null): value is EventLocale {
  return !!value && (EVENT_LOCALES as readonly string[]).includes(value)
}

export function parseLocales(values: unknown, fallback: EventLocale[] = ['en']): EventLocale[] {
  const list = Array.isArray(values) ? values : []
  const enabled = EVENT_LOCALES.filter((locale) => list.includes(locale))
  return enabled.length ? [...enabled] : fallback
}

export function resolveLocales(
  enabledInput: unknown,
  defaultInput?: string | null,
): { default: EventLocale; enabled: EventLocale[] } {
  const enabled = parseLocales(enabledInput, defaultInput && isEventLocale(defaultInput) ? [defaultInput] : ['en'])
  const fallback = enabled[0]
  const selected = isEventLocale(defaultInput) && enabled.includes(defaultInput) ? defaultInput : fallback
  return { default: selected, enabled }
}
