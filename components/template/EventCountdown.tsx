'use client'

import { useEffect, useState } from 'react'

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, '0')
}

export function EventCountdown({
  date,
  labels,
  accent,
}: {
  date: string
  labels: { days: string; hours: string; minutes: string; seconds: string }
  accent: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!date) return null
  const target = new Date(`${date}T18:00:00`).getTime()
  if (Number.isNaN(target)) return null
  let diff = Math.max(0, target - now)
  const days = Math.floor(diff / 86_400_000)
  diff -= days * 86_400_000
  const hours = Math.floor(diff / 3_600_000)
  diff -= hours * 3_600_000
  const minutes = Math.floor(diff / 60_000)
  const seconds = Math.floor((diff - minutes * 60_000) / 1000)
  const cells = [
    { label: labels.days, value: String(days) },
    { label: labels.hours, value: pad(hours) },
    { label: labels.minutes, value: pad(minutes) },
    { label: labels.seconds, value: pad(seconds) },
  ]

  return (
    <div className="relative mx-auto mt-10 grid max-w-md grid-cols-4 gap-2">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-2xl border border-white/10 px-2 py-3 text-center"
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          <p className="font-display text-2xl md:text-3xl" style={{ color: accent }}>
            {cell.value}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-widest opacity-60">{cell.label}</p>
        </div>
      ))}
    </div>
  )
}
