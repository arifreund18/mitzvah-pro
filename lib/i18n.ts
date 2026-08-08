export const LOCALES = ['en', 'pt'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

export function localeHref(locale: Locale): string {
  return locale === 'en' ? '/' : `/${locale}`
}

export async function getMessages(locale: Locale) {
  return (await import(`../messages/${locale}.json`)).default
}
