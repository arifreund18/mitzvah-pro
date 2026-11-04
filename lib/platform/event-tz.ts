/** Event calendar timezone for cron day comparisons (reminders + digests). */
export function eventTimeZone(): string {
  return process.env.EVENT_TZ?.trim() || 'America/Sao_Paulo'
}

/** Calendar date YYYY-MM-DD in the given IANA timezone. */
export function calendarDateInTz(date: Date, timeZone = eventTimeZone()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Whole days from "today" in EVENT_TZ until isoDate (YYYY-MM-DD). */
export function daysUntilEventDate(isoDate: string, now = new Date()): number | null {
  const target = isoDate?.trim().slice(0, 10)
  if (!target || !/^\d{4}-\d{2}-\d{2}$/.test(target)) return null
  const today = calendarDateInTz(now)
  const start = Date.parse(`${today}T12:00:00.000Z`)
  const end = Date.parse(`${target}T12:00:00.000Z`)
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return Math.round((end - start) / (24 * 60 * 60 * 1000))
}

export function yearMonthInTz(date: Date, timeZone = eventTimeZone()): string {
  return calendarDateInTz(date, timeZone).slice(0, 7)
}

/** ISO week key YYYY-Www in timezone (Mon-based). */
export function isoWeekKeyInTz(date: Date, timeZone = eventTimeZone()): string {
  const ymd = calendarDateInTz(date, timeZone)
  const [y, m, d] = ymd.split('-').map(Number)
  const utc = new Date(Date.UTC(y!, m! - 1, d!))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
