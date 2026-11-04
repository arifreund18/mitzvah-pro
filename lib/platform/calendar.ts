import type { EventConfig } from './types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local wall-clock parts from config.basics.date + startTime. */
export function eventStartParts(config: EventConfig): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
} | null {
  const date = config.basics.date?.trim()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [year, month, day] = date.split('-').map(Number)
  const time = (config.basics.startTime || '10:00').trim()
  const match = time.match(/^(\d{1,2}):(\d{2})/)
  const hour = match ? Math.min(23, Number(match[1])) : 10
  const minute = match ? Math.min(59, Number(match[2])) : 0
  return { year: year!, month: month!, day: day!, hour, minute }
}

function compactLocal(parts: NonNullable<ReturnType<typeof eventStartParts>>, endHourOffset = 2) {
  const start = `${parts.year}${pad(parts.month)}${pad(parts.day)}T${pad(parts.hour)}${pad(parts.minute)}00`
  let endHour = parts.hour + endHourOffset
  let endDay = parts.day
  let endMonth = parts.month
  let endYear = parts.year
  if (endHour >= 24) {
    endHour -= 24
    endDay += 1
    // simple month rollover is enough for calendar deep links
    const dim = new Date(endYear, endMonth, 0).getDate()
    if (endDay > dim) {
      endDay = 1
      endMonth += 1
      if (endMonth > 12) {
        endMonth = 1
        endYear += 1
      }
    }
  }
  const end = `${endYear}${pad(endMonth)}${pad(endDay)}T${pad(endHour)}${pad(parts.minute)}00`
  return { start, end }
}

function titleOf(config: EventConfig): string {
  return config.domain.seoTitle || config.story.headline || config.basics.honoreeName || 'Event'
}

function locationOf(config: EventConfig): string {
  return [config.basics.city, config.basics.country].filter(Boolean).join(', ')
}

function detailsOf(config: EventConfig): string {
  return config.story.subtitle || config.invitation.body || ''
}

export function google(config: EventConfig): string {
  const parts = eventStartParts(config)
  if (!parts) return ''
  const { start, end } = compactLocal(parts)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titleOf(config),
    dates: `${start}/${end}`,
    details: detailsOf(config),
    location: locationOf(config),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** @deprecated Prefer `google`. */
export function googleCalendarUrl(config: EventConfig): string {
  return google(config)
}

export function outlook(config: EventConfig): string {
  const parts = eventStartParts(config)
  if (!parts) return ''
  const startIso = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:00`
  const endHour = Math.min(23, parts.hour + 2)
  const endIso = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(endHour)}:${pad(parts.minute)}:00`
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: titleOf(config),
    body: detailsOf(config),
    location: locationOf(config),
    startdt: startIso,
    enddt: endIso,
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function icsContent(config: EventConfig, opts?: { url?: string }): string {
  const parts = eventStartParts(config)
  if (!parts) return ''
  const { start, end } = compactLocal(parts)
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
  const escape = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mitzvah Pro//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${config.domain.slug || 'event'}-${start}@mitzvah.pro`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escape(titleOf(config))}`,
    `DESCRIPTION:${escape(detailsOf(config))}`,
    `LOCATION:${escape(locationOf(config))}`,
  ]
  if (opts?.url) lines.push(`URL:${opts.url}`)
  lines.push('END:VEVENT', 'END:VCALENDAR', '')
  return lines.join('\r\n')
}
