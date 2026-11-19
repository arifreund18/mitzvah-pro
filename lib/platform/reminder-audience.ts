import type { Guest, ReminderAudience } from './types.ts'

export const REMINDER_AUDIENCES: ReminderAudience[] = ['all', 'yes', 'pending']

export function isReminderAudience(value: unknown): value is ReminderAudience {
  return REMINDER_AUDIENCES.includes(value as ReminderAudience)
}

/**
 * Whether a guest should receive a reminder for the given audience filter.
 * Guests without email are excluded by the caller.
 */
export function guestMatchesReminderAudience(
  guest: Pick<Guest, 'status'>,
  audience: ReminderAudience,
): boolean {
  if (audience === 'all') return true
  if (audience === 'yes') return guest.status === 'yes'
  return guest.status === 'pending'
}

/** Map legacy onlyConfirmedForD7D2 + missing per-window fields onto audiences. */
export function resolveReminderAudience(
  days: 30 | 7 | 2,
  reminders: {
    audienceD30?: ReminderAudience
    audienceD7?: ReminderAudience
    audienceD2?: ReminderAudience
    onlyConfirmedForD7D2?: boolean
  },
): ReminderAudience {
  if (days === 30) {
    return isReminderAudience(reminders.audienceD30) ? reminders.audienceD30 : 'all'
  }
  const key = days === 7 ? reminders.audienceD7 : reminders.audienceD2
  if (isReminderAudience(key)) return key
  // Legacy: D-7 / D-2 defaulted to confirmed-only when the checkbox was on.
  return reminders.onlyConfirmedForD7D2 === false ? 'all' : 'yes'
}
