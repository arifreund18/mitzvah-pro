import type { EventConfig } from './types'

export function sanitizeFromDisplayName(name: string | undefined | null): string {
  const cleaned = (name || '').replace(/[<>\r\n"]/g, '').trim()
  return cleaned || 'Mitzvah.pro'
}

/** Extract bare email from `Name <email@x>` or plain `email@x`. */
export function emailAddressOnly(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return (match?.[1] || from).trim()
}

export function formatFromAddress(displayName: string, emailOrFrom: string): string {
  const email = emailAddressOnly(emailOrFrom)
  const name = sanitizeFromDisplayName(displayName)
  return `${name} <${email}>`
}

/** Prefer invitation host line for the visible From name in inboxes. */
export function eventFromDisplayName(config: EventConfig): string {
  return sanitizeFromDisplayName(
    config.invitation.hostLine ||
      config.basics.familyName ||
      config.basics.honoreeName ||
      'Mitzvah.pro',
  )
}

/** Resolve Resend `from` with Host line as the inbox display name. */
export function eventSendFrom(config: EventConfig): string | null {
  const mail = config.domain.mail
  const raw =
    mail?.status === 'verified' && mail.fromEmail
      ? mail.fromEmail
      : process.env.RESEND_FROM_EMAIL || null
  if (!raw) return null
  return formatFromAddress(eventFromDisplayName(config), raw)
}
