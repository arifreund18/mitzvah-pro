'use client'

import { useEffect, useRef, useState } from 'react'
import { BCP47, formatShortDate } from '@/lib/platform/copy'
import type { EventLocale } from '@/lib/platform/types'
import { cn } from '@/lib/utils'

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function DatePicker({
  value,
  onChange,
  locale,
  placeholder,
}: {
  value: string
  onChange: (iso: string) => void
  locale: EventLocale
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const selected = value ? parseIso(value) : null
  const [cursor, setCursor] = useState(() => selected ?? new Date())

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const startWeekday = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const bcp = BCP47[locale]
  const monthLabel = new Intl.DateTimeFormat(bcp, { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(bcp, { weekday: 'short' }).format(new Date(2021, 10, i + 1)),
  )

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open && selected) {
            setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1))
          }
          setOpen((v) => !v)
        }}
        className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-start text-sm text-white outline-none focus:border-cyan-400/60"
      >
        <span className={value ? 'text-white' : 'text-white/35'}>
          {value ? formatShortDate(value, locale) : placeholder}
        </span>
        <span aria-hidden className="text-cyan-300">
          📅
        </span>
      </button>
      {open ? (
        <div className="absolute z-30 mt-2 w-full min-w-[280px] rounded-2xl border border-white/15 bg-[#12182a] p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between text-sm">
            <button
              type="button"
              className="rounded-lg px-2 py-1 hover:bg-white/10"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              ‹
            </button>
            <span className="capitalize">{monthLabel}</span>
            <button
              type="button"
              className="rounded-lg px-2 py-1 hover:bg-white/10"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-white/40">
            {weekdays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const iso = toIso(new Date(year, month, day))
              const active = value === iso
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                  className={cn(
                    'h-9 rounded-lg text-sm hover:bg-white/10',
                    active && 'bg-cyan-400 font-semibold text-[#0b1020] hover:bg-cyan-300',
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
