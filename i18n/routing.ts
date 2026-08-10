import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'pt', 'es', 'he'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})
