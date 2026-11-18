'use client'

import { useRouter } from 'next/navigation'
import { LOCALE_OPTIONS } from '@/lib/platform/locales'
import { STUDIO_LOCALE_COOKIE } from '@/lib/platform/studio-locale'
import type { EventLocale } from '@/lib/platform/types'

export function StudioLocaleSwitcher({
  locale,
  label,
}: {
  locale: EventLocale
  label: string
}) {
  const router = useRouter()
  return (
    <label className="flex items-center gap-2 text-xs text-white/50">
      <span className="hidden sm:inline">{label}</span>
      <select
        value={locale}
        className="rounded-lg border border-white/15 bg-[#12182a] px-2 py-1 text-xs text-white"
        onChange={(e) => {
          const next = e.target.value as EventLocale
          document.cookie = `${STUDIO_LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
          router.refresh()
        }}
      >
        {LOCALE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
