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

/** Prefer the Family field for the visible From name in inboxes (no “The … family” wrapper). */
export function eventFromDisplayName(config: EventConfig): string {
  return sanitizeFromDisplayName(
    config.basics.familyName ||
      config.invitation.hostLine ||
      config.basics.honoreeName ||
      'Mitzvah.pro',
  )
}

/** Shared From: EMAIL_FROM_ADDRESS (SES) or RESEND_FROM_EMAIL (Resend fallback). */
function sharedMailFrom(): string | null {
  const provider = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase()
  if (provider === 'resend') {
    return process.env.RESEND_FROM_EMAIL || null
  }
  return (
    process.env.EMAIL_FROM_ADDRESS ||
    process.env.SES_FROM_EMAIL ||
    (provider === 'ses' || process.env.AWS_ACCESS_KEY_ID
      ? 'convites@mitzvah.pro'
      : process.env.RESEND_FROM_EMAIL) ||
    null
  )
}

/** Resolve provider `from` with Family (or host line fallback) as the inbox display name. */
export function eventSendFrom(config: EventConfig): string | null {
  const mail = config.domain.mail
  const raw =
    mail?.status === 'verified' && mail.fromEmail
      ? mail.fromEmail
      : sharedMailFrom()
  if (!raw) return null
  return formatFromAddress(eventFromDisplayName(config), raw)
}

/** Reply-To do anfitrião (contato do evento / notify), para domínio SES compartilhado. */
export function eventHostReplyTo(config: EventConfig): string | undefined {
  const candidates = [
    config.contact?.email,
    ...(config.contact?.people || []).map((p) => p.email),
    ...(config.rsvp?.notifyEmails || []),
  ]
  for (const value of candidates) {
    const email = (value || '').trim()
    if (email && email.includes('@')) return email
  }
  return undefined
}
