'use client'

import { useState } from 'react'
import type { FaqItem } from '@/lib/platform/types'

export function EventFaq({
  items,
  accent,
  card,
  muted,
}: {
  items: FaqItem[]
  accent: string
  card: string
  muted: string
}) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null)
  return (
    <div className="mt-8 space-y-3">
      {items.map((item) => {
        const active = open === item.id
        return (
          <div key={item.id} className="overflow-hidden rounded-2xl" style={{ background: card }}>
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-start font-semibold"
              onClick={() => setOpen(active ? null : item.id)}
            >
              <span>{item.question}</span>
              <span style={{ color: accent }}>{active ? '–' : '+'}</span>
            </button>
            {active ? (
              <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: muted }}>
                {item.answer}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
