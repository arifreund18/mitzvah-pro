'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [pos, setPos] = useState({ top: 0, left: 0, width: 272, maxHeight: 320, ready: false })
  const trigger = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const selected = value ? parseIso(value) : null
  const [cursor, setCursor] = useState(() => selected ?? new Date())

  function place() {
    const el = trigger.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const margin = 8
    const gap = 6
    const width = Math.min(272, window.innerWidth - margin * 2)
    const naturalH = pop.current?.scrollHeight || 240
    const spaceBelow = window.innerHeight - rect.bottom - gap - margin
    const spaceAbove = rect.top - gap - margin
    const openUp = spaceBelow < naturalH && spaceAbove > spaceBelow
    const available = openUp ? spaceAbove : spaceBelow
    const maxHeight = Math.min(window.innerHeight - margin * 2, Math.max(160, available))
    const height = Math.min(naturalH, maxHeight)
    let top = openUp ? rect.top - gap - height : rect.bottom + gap
    top = Math.min(Math.max(margin, top), window.innerHeight - height - margin)
    let left = rect.left
    if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin
    if (left < margin) left = margin
    setPos({ top, left, width, maxHeight, ready: true })
  }

  function toggle() {
    if (!open && selected) {
      setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1))
    }
    if (!open) setPos((current) => ({ ...current, ready: false }))
    setOpen((v) => !v)
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    const frame = window.requestAnimationFrame(place)
    function onScroll() {
      place()
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, cursor])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (trigger.current?.contains(target) || pop.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7
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

  const calendar = open
    ? createPortal(
        <div
          ref={pop}
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxHeight,
            position: 'fixed',
            visibility: pos.ready ? 'visible' : 'hidden',
          }}
          className="z-[80] overflow-y-auto rounded-xl border border-white/20 bg-[#12182a] p-2 text-white shadow-2xl"
        >
          <div className="mb-1.5 flex items-center justify-between text-sm">
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
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-white/40">
            {weekdays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="mt-0.5 grid grid-cols-7 gap-0.5">
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
                    'h-7 rounded-md text-xs text-white hover:bg-white/10',
                    active && 'bg-cyan-400 font-semibold text-[#0b1020] hover:bg-cyan-300',
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div>
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-white/15 bg-[#12182a] px-3 py-3 text-start text-sm text-white outline-none hover:border-cyan-400/50 focus:border-cyan-400/60"
      >
        <span className={value ? 'text-white' : 'text-white/45'}>
          {value ? formatShortDate(value, locale) : placeholder}
        </span>
        <span aria-hidden className="text-cyan-300">
          📅
        </span>
      </button>
      {calendar}
    </div>
  )
}
