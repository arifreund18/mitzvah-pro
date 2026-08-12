import { typeLabel } from './copy'
import type { EventConfig, Guest } from './types'

export function mailSubject(kind: 'std' | 'invite', config: EventConfig): string {
  const name = config.basics.honoreeName || 'Mitzvah.pro'
  if (kind === 'std') return `Save the Date — ${name}`
  return `${typeLabel(config.basics.type, config.locales.default)} — ${name}`
}

export function mailHtml(
  kind: 'std' | 'invite',
  config: EventConfig,
  origin: string,
  guest: Guest,
): string {
  const name = config.basics.honoreeName || ''
  const accent = config.branding.accentColor || '#22d3ee'
  const href =
    kind === 'std'
      ? `${origin}/e/${config.domain.slug}/std`
      : `${origin}/e/${config.domain.slug}/invite`
  const body = kind === 'std' ? config.saveTheDate.message : config.invitation.body
  const greeting = kind === 'invite' ? config.invitation.greeting : 'Save the Date'
  const cta = kind === 'std' ? 'Open save the date' : 'Open invitation'
  return `<!doctype html>
<html>
<body style="margin:0;background:#1a2033;font-family:Georgia,serif;color:#1c1630;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#f7f1e4;border-radius:24px;padding:40px 32px;text-align:center;">
        <tr><td style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:${accent};">${greeting}</td></tr>
        <tr><td style="padding-top:16px;font-size:32px;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding-top:16px;font-size:16px;line-height:1.5;">${escapeHtml(body)}</td></tr>
        <tr><td style="padding-top:12px;font-size:14px;">${escapeHtml(guest.familyName)}</td></tr>
        <tr><td style="padding-top:28px;">
          <a href="${href}" style="background:${accent};color:#0b1020;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;">${cta}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
