import { mailFollowUpHtml, mailFollowUpSubject } from './mail.ts'
import { resolveGuestLocale } from './guest-locale.ts'
import { previewScheduledDays } from './scheduled-guest-mail.ts'
import type { EventConfig, Guest } from './types.ts'

export { previewScheduledDays }

function defaultFollowUpBody(locale: ReturnType<typeof resolveGuestLocale>, name: string, days: number): string {
  if (locale === 'pt') {
    return `Oi! Passando para lembrar que ${name} é em ${days} dia${days === 1 ? '' : 's'}. Qualquer novidade, avisamos por aqui.`
  }
  if (locale === 'es') {
    return `¡Hola! Solo para recordar que ${name} es en ${days} día${days === 1 ? '' : 's'}. Si hay novedades, te avisamos por aquí.`
  }
  if (locale === 'he') {
    return `היי! רק להזכיר ש-${name} בעוד ${days} ימים. אם יש עדכונים — נעדכן כאן.`
  }
  return `Hi! Just a note that ${name} is in ${days} day${days === 1 ? '' : 's'}. We'll share any updates here.`
}

export function mailFollowUpScheduleSubject(
  config: EventConfig,
  guest: Guest,
  days: number,
): string {
  const base = mailFollowUpSubject({ type: 'message', subject: '' }, config, guest)
  return `${base} (${days}d)`
}

/**
 * Automatic follow-up schedule email — "message" layout (headline + quoted body),
 * distinct from cron reminder card emails.
 */
export function mailFollowUpScheduleHtml(
  config: EventConfig,
  host: string,
  guest: Guest,
  days: number,
): string {
  const locale = resolveGuestLocale(guest, config)
  const name = config.basics.honoreeName || 'Mitzvah'
  const custom = config.followUpSchedule.message?.trim()
  const body = custom || defaultFollowUpBody(locale, name, days)
  return mailFollowUpHtml({ type: 'message', body }, config, host, guest)
}
