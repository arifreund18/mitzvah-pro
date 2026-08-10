'use client'

import { useEffect } from 'react'
import { isRtlLocale, type Locale } from '@/lib/i18n'

/** Syncs <html lang> and dir with the active locale (root layout cannot read [locale]). */
export function DocumentLocale({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr'
  }, [locale])

  return null
}
