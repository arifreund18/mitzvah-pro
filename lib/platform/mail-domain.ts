import { SITE_HOST } from './site-url'
import { formatFromAddress, sanitizeFromDisplayName } from './mail-from'
import type { EventMailDomain, MailDomainStatus } from './types'

export {
  emailAddressOnly,
  eventFromDisplayName,
  eventHostReplyTo,
  eventSendFrom,
  formatFromAddress,
  sanitizeFromDisplayName,
} from './mail-from'

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
  const name = sanitizeFromDisplayName(honoreeName)
  return formatFromAddress(name, `${MAIL_FROM_LOCAL}@${domain}`)
}
