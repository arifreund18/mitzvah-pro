'use client'

import { LOCALE_OPTIONS } from '@/lib/platform/locales'
import type { EventLocale } from '@/lib/platform/types'

export function EventSiteLocales({
  enabled,
  current,
  accent,
}: {
  slug?: string
  enabled: EventLocale[]
  current: EventLocale
  accent: string
}) {
  if (enabled.length < 2) return null
  return (
    <div className="flex justify-center gap-2">
      {LOCALE_OPTIONS.filter((option) => enabled.includes(option.value)).map((option) => {
        const active = option.value === current
        return (
          <a
            key={option.value}
            href={`?lang=${option.value}`}
            className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
            style={{
              background: active ? accent : 'transparent',
              color: active ? '#0b1020' : accent,
              border: `1px solid ${accent}`,
            }}
          >
            {option.value}
          </a>
        )
      })}
    </div>
  )
}
