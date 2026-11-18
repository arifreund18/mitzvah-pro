import type { EventConfig } from './types.ts'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export type ClockTime = { hour: number; minute: number }

/** Parse "17:30", "5:30 pm", "5:30pm", "5.30 PM". */
export function parseClockTime(raw: string): ClockTime | null {
  const s = String(raw || '').trim()
  if (!s) return null
  const m12 = s.match(/^(\d{1,2})(?::|\.)(\d{2})\s*(a\.?m\.?|p\.?m\.?)$/i)
  if (m12) {
    let hour = Number(m12[1])
    const minute = Number(m12[2])
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
    const ap = m12[3].replace(/\./g, '').toLowerCase()
    if (ap.startsWith('p') && hour < 12) hour += 12
    if (ap.startsWith('a') && hour === 12) hour = 0
    return { hour: Math.min(23, hour), minute: Math.min(59, minute) }
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) {
    const hour = Number(m24[1])
    const minute = Number(m24[2])
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
    return { hour: Math.min(23, hour), minute: Math.min(59, minute) }
  }
  return null
}

/**
 * Parse a free-text time or range from the invitation card (`timeLabel`),
 * e.g. "5:30 pm - 11:00 pm" or "17:30–23:00".
 */
export function parseTimeRange(label: string): { start: ClockTime; end?: ClockTime } | null {
  const raw = String(label || '').trim()
  if (!raw) return null
  const parts = raw.split(/\s*[-–—]\s*/).map((part) => part.trim()).filter(Boolean)
  if (!parts.length) return null
  const start = parseClockTime(parts[0]!)
  if (!start) return null
  const end = parts[1] ? parseClockTime(parts[1]) || undefined : undefined
  return { start, end }
}

function designTimeRange(
  config: EventConfig,
  kind: 'std' | 'invite',
): { start: ClockTime; end?: ClockTime } | null {
  const design = kind === 'std' ? config.saveTheDate.design : config.invitation.design
  return parseTimeRange(design?.timeLabel || '')
}

/** Local wall-clock parts from design.timeLabel (preferred) or basics.startTime. */
export function eventStartParts(
  config: EventConfig,
  kind: 'std' | 'invite' = 'invite',
): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  endHour: number
  endMinute: number
} | null {
  const date = config.basics.date?.trim()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [year, month, day] = date.split('-').map(Number)
  const fromLabel = designTimeRange(config, kind)
  const fromBasics = parseClockTime(config.basics.startTime || '')
  const start = fromLabel?.start || fromBasics || { hour: 10, minute: 0 }
  const end =
    fromLabel?.end ||
    ({
      hour: Math.min(23, start.hour + 2),
      minute: start.minute,
    } as ClockTime)
  return {
    year: year!,
    month: month!,
    day: day!,
    hour: start.hour,
    minute: start.minute,
    endHour: end.hour,
    endMinute: end.minute,
  }
}

function compactLocal(parts: NonNullable<ReturnType<typeof eventStartParts>>) {
  const start = `${parts.year}${pad(parts.month)}${pad(parts.day)}T${pad(parts.hour)}${pad(parts.minute)}00`
  let endHour = parts.endHour
  let endMinute = parts.endMinute
  let endDay = parts.day
  let endMonth = parts.month
  let endYear = parts.year
  const startMinutes = parts.hour * 60 + parts.minute
  const endMinutes = endHour * 60 + endMinute
  if (endMinutes <= startMinutes) {
    // Range crossed midnight (or identical) — push end to next day when needed.
    endDay += 1
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
  const end = `${endYear}${pad(endMonth)}${pad(endDay)}T${pad(endHour)}${pad(endMinute)}00`
  return { start, end }
}

/** Calendar event title — prefer design "Assunto (email)" (`subject`). */
export function titleOf(config: EventConfig, kind: 'std' | 'invite' = 'invite'): string {
  const design = kind === 'std' ? config.saveTheDate.design : config.invitation.design
  const custom = design.subject?.trim()
  if (custom) {
    const name = config.basics.honoreeName || 'Mitzvah.pro'
    return custom.includes('{name}') ? custom.replaceAll('{name}', name) : custom
  }
  return config.domain.seoTitle || config.story.headline || config.basics.honoreeName || 'Event'
}

/**
 * Full venue for calendar LOCATION — use invitation place/address fields as-is.
 * Do not append basics.city/country when design already has an address (avoids
 * extras like "Sandy Springs, USA" when address1 already has Atlanta, GA).
 */
export function locationOf(config: EventConfig, kind: 'std' | 'invite' = 'invite'): string {
  const design = kind === 'std' ? config.saveTheDate.design : config.invitation.design
  const primary = [design.placeLabel, design.address1, design.address2]
    .map((part) => part?.trim())
    .filter(Boolean) as string[]
  if (primary.length) return primary.join(', ')
  return [config.basics.city, config.basics.country].filter(Boolean).join(', ')
}

function detailsOf(config: EventConfig): string {
  return config.story.subtitle || config.invitation.body || ''
}

export function google(config: EventConfig, kind: 'std' | 'invite' = 'invite'): string {
  const parts = eventStartParts(config, kind)
  if (!parts) return ''
  const { start, end } = compactLocal(parts)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titleOf(config, kind),
    dates: `${start}/${end}`,
    details: detailsOf(config),
    location: locationOf(config, kind),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** @deprecated Prefer `google`. */
export function googleCalendarUrl(config: EventConfig): string {
  return google(config)
}

export function outlook(config: EventConfig, kind: 'std' | 'invite' = 'invite'): string {
  const parts = eventStartParts(config, kind)
  if (!parts) return ''
  const startIso = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:00`
  const endIso = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.endHour)}:${pad(parts.endMinute)}:00`
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: titleOf(config, kind),
    body: detailsOf(config),
    location: locationOf(config, kind),
    startdt: startIso,
    enddt: endIso,
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function icsContent(
  config: EventConfig,
  opts?: { url?: string; kind?: 'std' | 'invite' },
): string {
  const kind = opts?.kind || 'invite'
  const parts = eventStartParts(config, kind)
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
    `SUMMARY:${escape(titleOf(config, kind))}`,
    `DESCRIPTION:${escape(detailsOf(config))}`,
    `LOCATION:${escape(locationOf(config, kind))}`,
  ]
  if (opts?.url) lines.push(`URL:${opts.url}`)
  lines.push('END:VEVENT', 'END:VCALENDAR', '')
  return lines.join('\r\n')
}
