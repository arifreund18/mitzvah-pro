import { reminderCopy } from './guest-ui.ts'
import { resolveGuestLocale } from './guest-locale.ts'
import { mailFollowUpHtml } from './mail.ts'
import type { EventConfig, Guest } from './types.ts'

/** Prefer nearer windows for the wizard preview subject/body. */
export function previewReminderDays(reminders: EventConfig['reminders']): number {
  if (reminders.d7) return 7
  if (reminders.d2) return 2
  if (reminders.d30) return 30
  return 7
}

export function mailReminderSubject(
  config: EventConfig,
  guest: Guest,
  days: number,
): string {
  const locale = resolveGuestLocale(guest, config)
  const name = config.basics.honoreeName || 'Mitzvah'
  return reminderCopy(locale, name, days, guest.familyName, config.reminders.message).subject
}

/**
 * Automatic reminder email HTML — same visual language as host follow-up
 * reminders (greeting, body, VIEW CARD, card, calendar/map rows).
 */
export function mailReminderHtml(
  config: EventConfig,
  host: string,
  guest: Guest,
  days: number,
): string {
  const locale = resolveGuestLocale(guest, config)
  const name = config.basics.honoreeName || 'Mitzvah'
  const copy = reminderCopy(
    locale,
    name,
    days,
    guest.familyName,
    config.reminders.message,
  )
  return mailFollowUpHtml(
    { type: 'reminder', body: copy.body },
    config,
    host,
    guest,
  )
}
