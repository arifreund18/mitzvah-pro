import { calendarDateInTz, eventTimeZone } from './event-tz.ts'

/** True when today (in EVENT_TZ) is after the RSVP deadline date (inclusive through that day). */
export function isRsvpDeadlinePassed(deadline: string, now = new Date()): boolean {
  const day = String(deadline || '').trim().slice(0, 10)
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const today = calendarDateInTz(now, eventTimeZone())
  return today > day
}
