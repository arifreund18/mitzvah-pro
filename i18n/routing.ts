import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'pt', 'es', 'he'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // Keep the URL as source of truth so "/" (EN) is not redirected
  // back to /pt|/es|/he based on the NEXT_LOCALE cookie.
  localeDetection: false,
})
