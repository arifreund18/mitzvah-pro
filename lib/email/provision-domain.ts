import { getResend, resolveEmailProvider, sharedFromEmail } from '@/lib/email/send'
import { emailIdentityFromAddress, getSesIdentityStatus } from '@/lib/email/ses-identity'
import { upsertVercelRecord, vercelDnsConfigured, type DnsUpsert } from '@/lib/email/vercel-dns'
import {
  emptyMailDomain,
  eventFromAddress,
  eventFromDisplayName,
  eventMailDomainName,
  formatFromAddress,
} from '@/lib/platform/mail-domain'
import type { EventConfig, EventMailDomain } from '@/lib/platform/types'

type ResendDnsRecord = {
  record?: string
  name: string
  type: string
  value: string
  priority?: number
}

function stripQuotes(value: string): string {
  return value.replace(/^"+|"+$/g, '').trim()
}

function absoluteRecordName(recordName: string, sendingDomain: string): string {
  const name = recordName.replace(/\.$/, '').trim()
  if (!name || name === '@') return sendingDomain
  if (name === sendingDomain || name.endsWith(`.${sendingDomain}`)) return name
  return `${name}.${sendingDomain}`
}

function toDnsUpsert(record: ResendDnsRecord, sendingDomain: string): DnsUpsert | null {
  if (record.record === 'Receiving' || record.record === 'TrackingCAA') return null
  const type = record.type.toUpperCase()
  if (type !== 'MX' && type !== 'TXT' && type !== 'CNAME' && type !== 'CAA') return null
  return {
    type,
    name: absoluteRecordName(record.name, sendingDomain),
    content: stripQuotes(record.value),
    priority: record.priority,
  }
}

async function findResendDomainId(name: string): Promise<string | null> {
  const resend = getResend()
  if (!resend) return null
  const listed = await resend.domains.list({ limit: 100 })
  if (listed.error || !listed.data) return null
  return listed.data.data.find((domain) => domain.name === name)?.id ?? null
}

async function ensureResendDomain(name: string): Promise<{
  id: string
  records: ResendDnsRecord[]
  status: string
}> {
  const resend = getResend()
  if (!resend) throw new Error('Resend não configurado')

  const created = await resend.domains.create({
    name,
    capabilities: { sending: 'enabled', receiving: 'disabled' },
    openTracking: false,
    clickTracking: false,
  })

  if (created.data) {
    return {
      id: created.data.id,
      records: created.data.records as ResendDnsRecord[],
      status: created.data.status,
    }
  }

  const existingId = await findResendDomainId(name)
  if (!existingId) {
    throw new Error(created.error?.message || 'Não foi possível criar o domínio no Resend')
  }
  const existing = await resend.domains.get(existingId)
  if (existing.error || !existing.data) {
    throw new Error(existing.error?.message || 'Domínio Resend existente ilegível')
  }
  return {
    id: existing.data.id,
    records: existing.data.records as ResendDnsRecord[],
    status: existing.data.status,
  }
}

/**
 * Shared SES domain mode: one verified identity (SES_FROM_EMAIL), display name per event.
 * Does NOT create SES identities or write DNS — see docs/SES.md for manual steps.
 */
async function provisionSharedSesMail(config: EventConfig): Promise<EventMailDomain> {
  const shared = sharedFromEmail()
  const display = eventFromDisplayName(config)
  if (!shared) {
    return {
      ...emptyMailDomain(),
      status: 'skipped',
      lastError:
        'SES_FROM_EMAIL ausente — configure um remetente no domínio SES já verificado (docs/SES.md).',
    }
  }

  const identity = emailIdentityFromAddress(shared)
  const fromEmail = formatFromAddress(display, shared)
  const previous = config.domain.mail

  try {
    const status = await getSesIdentityStatus(identity)
    if (status.verified) {
      return {
        sendingDomain: identity,
        fromEmail,
        resendDomainId: previous?.resendDomainId || identity,
        status: 'verified',
        lastError: '',
        verifiedAt: previous?.verifiedAt || new Date().toISOString(),
      }
    }
    return {
      sendingDomain: identity,
      fromEmail,
      resendDomainId: previous?.resendDomainId || identity,
      status: 'pending',
      lastError:
        status.error ||
        `Identidade SES "${identity}" ainda não verificada. Adicione SPF/DKIM/DMARC manualmente (docs/SES.md).`,
      verifiedAt: null,
    }
  } catch (error) {
    return {
      sendingDomain: identity,
      fromEmail,
      resendDomainId: previous?.resendDomainId || '',
      status: 'failed',
      lastError: error instanceof Error ? error.message : 'Falha ao consultar identidade SES',
      verifiedAt: null,
    }
  }
}

async function provisionResendIsolatedMail(config: EventConfig): Promise<EventMailDomain> {
  const slug = config.domain.slug
  const sendingDomain = eventMailDomainName(slug)
  const fromEmail = eventFromAddress(slug, config.basics.honoreeName)
  const previous = config.domain.mail

  if (!getResend() || !vercelDnsConfigured()) {
    return {
      ...emptyMailDomain(),
      sendingDomain,
      fromEmail,
      status: 'skipped',
      lastError: 'Resend ou Vercel DNS não configurados — envio usa o remetente compartilhado.',
    }
  }

  if (
    previous?.status === 'verified' &&
    previous.sendingDomain === sendingDomain &&
    previous.resendDomainId
  ) {
    const resend = getResend()
    const current = await resend?.domains.get(previous.resendDomainId)
    if (current?.data?.status === 'verified') {
      return {
        ...previous,
        fromEmail,
        status: 'verified',
        lastError: '',
      }
    }
  }

  try {
    const domain = await ensureResendDomain(sendingDomain)
    const comment = `mitzvah-pro:${slug}`
    for (const record of domain.records) {
      const upsert = toDnsUpsert(record, sendingDomain)
      if (!upsert) continue
      await upsertVercelRecord(upsert, comment)
    }

    const resend = getResend()
    if (!resend) throw new Error('Resend não configurado')
    await resend.domains.verify(domain.id)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const verified = await resend.domains.get(domain.id)
    const status = verified.data?.status === 'verified' ? 'verified' : 'pending'

    return {
      sendingDomain,
      fromEmail,
      resendDomainId: domain.id,
      status,
      lastError: status === 'pending' ? 'DNS criado; verificação Resend ainda pendente.' : '',
      verifiedAt: status === 'verified' ? new Date().toISOString() : null,
    }
  } catch (error) {
    return {
      sendingDomain,
      fromEmail,
      resendDomainId: previous?.resendDomainId || '',
      status: 'failed',
      lastError: error instanceof Error ? error.message : 'Falha ao provisionar domínio de email',
      verifiedAt: null,
    }
  }
}

export async function provisionEventMailDomain(config: EventConfig): Promise<EventMailDomain> {
  const provider = resolveEmailProvider()
  if (provider === 'ses') {
    return provisionSharedSesMail(config)
  }
  if (provider === 'resend') {
    return provisionResendIsolatedMail(config)
  }
  const shared = sharedFromEmail()
  if (shared) {
    return {
      ...emptyMailDomain(),
      sendingDomain: emailIdentityFromAddress(shared),
      fromEmail: formatFromAddress(eventFromDisplayName(config), shared),
      status: 'skipped',
      lastError: 'Provedor de email não configurado — envio local apenas.',
    }
  }
  return {
    ...emptyMailDomain(),
    status: 'skipped',
    lastError: 'Nenhum provedor de email configurado (EMAIL_PROVIDER=ses|resend).',
  }
}

export async function refreshEventMailDomain(mail: EventMailDomain): Promise<EventMailDomain> {
  const provider = resolveEmailProvider()

  if (provider === 'ses') {
    const identity = mail.sendingDomain || emailIdentityFromAddress(mail.fromEmail || sharedFromEmail() || '')
    if (!identity) return mail
    try {
      const status = await getSesIdentityStatus(identity)
      if (status.verified) {
        return {
          ...mail,
          sendingDomain: identity,
          status: 'verified',
          lastError: '',
          verifiedAt: mail.verifiedAt || new Date().toISOString(),
        }
      }
      return {
        ...mail,
        sendingDomain: identity,
        status: 'pending',
        lastError:
          status.error ||
          `Aguardando verificação DNS no SES (${identity}). Ver docs/SES.md.`,
      }
    } catch (error) {
      return {
        ...mail,
        status: mail.status === 'verified' ? 'verified' : 'pending',
        lastError: error instanceof Error ? error.message : mail.lastError,
      }
    }
  }

  if (!mail.resendDomainId || !getResend()) return mail
  const resend = getResend()
  if (!resend) return mail
  try {
    await resend.domains.verify(mail.resendDomainId)
    const current = await resend.domains.get(mail.resendDomainId)
    if (current.data?.status === 'verified') {
      return {
        ...mail,
        status: 'verified',
        lastError: '',
        verifiedAt: mail.verifiedAt || new Date().toISOString(),
      }
    }
    return {
      ...mail,
      status: 'pending',
      lastError: 'Aguardando verificação DNS no Resend.',
    }
  } catch (error) {
    return {
      ...mail,
      status: mail.status === 'verified' ? 'verified' : 'pending',
      lastError: error instanceof Error ? error.message : mail.lastError,
    }
  }
}
