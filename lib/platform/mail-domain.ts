import { SITE_HOST } from './site-url'
import type { EventConfig, EventMailDomain, MailDomainStatus } from './types'

export const MAIL_FROM_LOCAL = process.env.MAIL_FROM_LOCAL || 'convites'
export const MAIL_DOMAIN_PREFIX = process.env.MAIL_DOMAIN_PREFIX || 'mail'

const MAIL_STATUSES: MailDomainStatus[] = ['skipped', 'pending', 'verified', 'failed']

export function emptyMailDomain(): EventMailDomain {
  return {
    sendingDomain: '',
    fromEmail: '',
    resendDomainId: '',
    status: 'skipped',
    lastError: '',
    verifiedAt: null,
  }
}

export function normalizeMailDomain(raw: Partial<EventMailDomain> | null | undefined): EventMailDomain {
  const base = emptyMailDomain()
  if (!raw) return base
  const status = MAIL_STATUSES.includes(raw.status as MailDomainStatus)
    ? (raw.status as MailDomainStatus)
    : 'skipped'
  return {
    sendingDomain: raw.sendingDomain || '',
    fromEmail: raw.fromEmail || '',
    resendDomainId: raw.resendDomainId || '',
    status,
    lastError: raw.lastError || '',
    verifiedAt: raw.verifiedAt ?? null,
  }
}

export function eventMailDomainName(slug: string): string {
  return `${MAIL_DOMAIN_PREFIX}.${slug}.${SITE_HOST}`
}

export function eventFromAddress(slug: string, honoreeName?: string): string {
  const domain = eventMailDomainName(slug)
  const name = (honoreeName || 'Mitzvah.pro').replace(/[<>]/g, '').trim() || 'Mitzvah.pro'
  return `${name} <${MAIL_FROM_LOCAL}@${domain}>`
}

export function eventMailIsolationEnabled(): boolean {
  const raw = (process.env.EVENT_MAIL_ISOLATION ?? '1').trim().toLowerCase()
  return !['0', 'false', 'off', 'no'].includes(raw)
}

export function eventSendFrom(config: EventConfig): string | null {
  const shared = process.env.RESEND_FROM_EMAIL?.trim() || null
  if (!eventMailIsolationEnabled()) {
    if (!shared) return null
    if (shared.includes('<')) return shared
    const name = (config.basics.honoreeName || 'Mitzvah.pro').replace(/[<>]/g, '').trim() || 'Mitzvah.pro'
    return `${name} <${shared}>`
  }
  const mail = config.domain.mail
  if (mail?.status === 'verified' && mail.fromEmail) return mail.fromEmail
  return shared
}
