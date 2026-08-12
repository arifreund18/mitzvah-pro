'use client'

import { useMemo, useState } from 'react'
import type { LocalPlace } from '@/lib/platform/types'
import { PLACE_CATEGORIES } from '@/lib/platform/types'

export function EventPlaces({
  places,
  labels,
  accent,
  card,
  muted,
}: {
  places: LocalPlace[]
  labels: Record<string, string>
  accent: string
  card: string
  muted: string
}) {
  const cats = useMemo(
    () => PLACE_CATEGORIES.filter((cat) => places.some((place) => place.category === cat)),
    [places],
  )
  const [filter, setFilter] = useState<string>('all')
  const visible = filter === 'all' ? places : places.filter((place) => place.category === filter)

  return (
    <div>
      {cats.length > 1 ? (
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: filter === 'all' ? accent : 'transparent',
              color: filter === 'all' ? '#0b1020' : accent,
              border: `1px solid ${accent}`,
            }}
          >
            All
          </button>
          {cats.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: filter === cat ? accent : 'transparent',
                color: filter === cat ? '#0b1020' : accent,
                border: `1px solid ${accent}`,
              }}
            >
              {labels[cat] || cat}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
        {visible.map((place) => (
          <div key={place.id} className="rounded-2xl p-5" style={{ background: card }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: accent }}>
              {labels[place.category] || place.category}
            </p>
            <h3 className="mt-1 text-lg font-semibold">{place.name}</h3>
            {place.notes ? (
              <p className="mt-2 text-sm" style={{ color: muted }}>
                {place.notes}
              </p>
            ) : null}
            <div className="mt-3 flex gap-3 text-sm" style={{ color: accent }}>
              {place.url ? (
                <a href={place.url} target="_blank" rel="noreferrer">
                  Website
                </a>
              ) : null}
              {place.mapUrl ? (
                <a href={place.mapUrl} target="_blank" rel="noreferrer">
                  Map
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
