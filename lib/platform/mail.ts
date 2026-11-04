import { typeLabel } from './copy'
import { eventPublicUrl, protocolFor } from './site-url'
import type { EventConfig, EventLocale, Guest } from './types'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const CTA: Record<EventLocale, { std: string; invite: string; rsvp: string }> = {
  en: { std: 'Open save the date', invite: 'Open invitation', rsvp: 'RSVP' },
  pt: { std: 'Abrir save the date', invite: 'Abrir convite', rsvp: 'Confirmar presença' },
  es: { std: 'Abrir save the date', invite: 'Abrir invitación', rsvp: 'Confirmar asistencia' },
  he: { std: 'פתחו את Save the Date', invite: 'פתחו את ההזמנה', rsvp: 'אשרו הגעה' },
}

function localeOf(guest: Guest, config: EventConfig): EventLocale {
  return guest.inviteLocale || config.locales.default || 'pt'
}

export function mailSubject(kind: 'std' | 'invite', config: EventConfig, guest?: Guest): string {
  const name = config.basics.honoreeName || 'Mitzvah.pro'
  const locale = guest ? localeOf(guest, config) : config.locales.default
  if (kind === 'std') return `Save the Date — ${name}`
  return `${typeLabel(config.basics.type, locale)} — ${name}`
}

export function mailHtml(
  kind: 'std' | 'invite',
  config: EventConfig,
  host: string,
  guest: Guest,
): string {
  const name = config.basics.honoreeName || ''
  const accent = config.branding.accentColor || '#22d3ee'
  const locale = localeOf(guest, config)
  const labels = CTA[locale] || CTA.pt
  const token = guest.token
  const cardPath = kind === 'std' ? `/std/${token}` : `/invite/${token}`
  const href = eventPublicUrl(config.domain.slug, cardPath, { host })
  const rsvpHref = eventPublicUrl(config.domain.slug, `/rsvp/${token}`, { host })
  const pixelPath =
    kind === 'std'
      ? `/api/platform/std/open/${encodeURIComponent(token)}`
      : `/api/platform/invite/open/${encodeURIComponent(token)}`
  const pixelUrl = `${protocolFor(host)}://${host}${pixelPath}`

  const body = kind === 'std' ? config.saveTheDate.message : config.invitation.body
  const greeting = kind === 'invite' ? config.invitation.greeting : 'Save the Date'
  const cta = kind === 'std' ? labels.std : labels.invite

  return `<!doctype html>
<html>
<body style="margin:0;background:#1a2033;font-family:Georgia,serif;color:#1c1630;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#f7f1e4;border-radius:24px;padding:40px 32px;text-align:center;">
        <tr><td style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:${escapeHtml(accent)};">${escapeHtml(greeting)}</td></tr>
        <tr><td style="padding-top:16px;font-size:32px;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding-top:16px;font-size:16px;line-height:1.5;">${escapeHtml(body)}</td></tr>
        <tr><td style="padding-top:12px;font-size:14px;">${escapeHtml(guest.familyName)}</td></tr>
        <tr><td style="padding-top:28px;">
          <a href="${escapeHtml(href)}" style="background:${escapeHtml(accent)};color:#0b1020;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;display:inline-block;">${escapeHtml(cta)}</a>
        </td></tr>
        <tr><td style="padding-top:16px;">
          <a href="${escapeHtml(rsvpHref)}" style="color:${escapeHtml(accent)};font-size:14px;">${escapeHtml(labels.rsvp)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <img src="${escapeHtml(pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
</body>
</html>`
}
