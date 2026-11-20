import { getResend, resolveEmailProvider, sharedFromEmail } from '@/lib/email/send'
import {
  attachConfigurationSetToIdentity,
  ensureEventConfigurationSet,
  eventConfigurationSetName,
} from '@/lib/email/ses-config-set'
import {
  ensureSesDomainIdentity,
  getSesIdentityStatus,
  sesDnsToUpserts,
} from '@/lib/email/ses-identity'
import { upsertVercelRecord, vercelDnsConfigured, type DnsUpsert } from '@/lib/email/vercel-dns'
import {
  emptyMailDomain,
  eventFromAddress,
  eventFromDisplayName,
  eventMailDomainName,
  formatFromAddress,
  MAIL_FROM_LOCAL,
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
 * SES per-event isolation: identity + DKIM for mail.{slug}.mitzvah.pro,
 * DNS via Vercel (same pattern as the old Resend flow). Reputation stays per event.
 * Falls back to EMAIL_FROM_ADDRESS while pending / if DNS ou AWS incompletos.
 */
async function provisionSesIsolatedMail(
  config: EventConfig,
  eventId?: string,
): Promise<EventMailDomain> {
  const slug = config.domain.slug
  const sendingDomain = eventMailDomainName(slug)
  const display = eventFromDisplayName(config)
  const fromEmail = formatFromAddress(display, `${MAIL_FROM_LOCAL}@${sendingDomain}`)
  const previous = config.domain.mail
  const sharedFallback = sharedFromEmail()
  // E8: keep an already-stored set name; only mint id-suffixed names for new sets.
  const configSetOpts = {
    eventId,
    name: previous?.configurationSetName || undefined,
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      ...emptyMailDomain(),
      sendingDomain,
      fromEmail: sharedFallback
        ? formatFromAddress(display, sharedFallback)
        : fromEmail,
      status: 'skipped',
      lastError:
        'AWS credentials ausentes — envio usa EMAIL_FROM_ADDRESS compartilhado até provisionar.',
    }
  }

  if (!vercelDnsConfigured()) {
    return {
      ...emptyMailDomain(),
      sendingDomain,
      fromEmail: sharedFallback
        ? formatFromAddress(display, sharedFallback)
        : fromEmail,
      status: 'skipped',
      lastError:
        'VERCEL_TOKEN ausente — sem DNS para mail.{slug}; envio usa remetente compartilhado.',
    }
  }

  if (
    previous?.status === 'verified' &&
    previous.sendingDomain === sendingDomain &&
    previous.fromEmail
  ) {
    const current = await getSesIdentityStatus(sendingDomain)
    if (current.verified) {
      const configSet = await ensureEventConfigurationSet(slug, configSetOpts)
      if (configSet.exists) {
        try {
          await attachConfigurationSetToIdentity(sendingDomain, configSet.name)
        } catch {
          // Identity already verified; SendEmail still passes ConfigurationSetName.
        }
      }
      return {
        ...previous,
        fromEmail,
        configurationSetName:
          (configSet.exists && configSet.name) ||
          previous.configurationSetName ||
          eventConfigurationSetName(slug, eventId),
        status: 'verified',
        lastError: configSet.exists
          ? ''
          : configSet.error || previous.lastError || '',
      }
    }
  }

  try {
    const configSet = await ensureEventConfigurationSet(slug, configSetOpts)
    if (!configSet.exists) {
      throw new Error(configSet.error || `Falha ao criar configuration set ${configSet.name}`)
    }

    const identity = await ensureSesDomainIdentity(sendingDomain, {
      configurationSetName: configSet.name,
    })
    if (identity.error && identity.verificationStatus === 'FAILED') {
      throw new Error(identity.error)
    }

    try {
      await attachConfigurationSetToIdentity(sendingDomain, configSet.name)
    } catch {
      // Identity may still be propagating; SendEmail also passes ConfigurationSetName.
    }

    const comment = `mitzvah-pro:ses:${slug}`
    for (const upsert of sesDnsToUpserts(identity.dnsRecords)) {
      await upsertVercelRecord(upsert, comment)
    }

    // Re-check after DNS write (propagation may still be pending).
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const verified = await getSesIdentityStatus(sendingDomain)
    const ok = verified.verified

    return {
      sendingDomain,
      fromEmail,
      resendDomainId: sendingDomain,
      configurationSetName: configSet.name,
      status: ok ? 'verified' : 'pending',
      lastError: ok
        ? ''
        : verified.error ||
          `DNS DKIM gravado para ${sendingDomain}; verificação SES ainda pendente.`,
      verifiedAt: ok ? new Date().toISOString() : null,
    }
  } catch (error) {
    return {
      sendingDomain,
      fromEmail: sharedFallback
        ? formatFromAddress(display, sharedFallback)
        : fromEmail,
      resendDomainId: previous?.resendDomainId || '',
      configurationSetName:
        previous?.configurationSetName || eventConfigurationSetName(slug, eventId),
      status: 'failed',
      lastError: error instanceof Error ? error.message : 'Falha ao provisionar identidade SES',
      verifiedAt: null,
    }
  }
}

async function provisionResendIsolatedMail(config: EventConfig): Promise<EventMailDomain> {
  const slug = config.domain.slug
  const sendingDomain = eventMailDomainName(slug)
  const fromEmail = eventFromAddress(slug, eventFromDisplayName(config))
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

export async function provisionEventMailDomain(
  config: EventConfig,
  eventId?: string,
): Promise<EventMailDomain> {
  const provider = resolveEmailProvider()
  if (provider === 'ses') return provisionSesIsolatedMail(config, eventId)
  if (provider === 'resend') return provisionResendIsolatedMail(config)
  return {
    ...emptyMailDomain(),
    status: 'skipped',
    lastError: 'Nenhum provedor de email configurado (EMAIL_PROVIDER=ses|resend).',
  }
}

export async function refreshEventMailDomain(mail: EventMailDomain): Promise<EventMailDomain> {
  const provider = resolveEmailProvider()

  if (provider === 'ses') {
    const identity = mail.sendingDomain || mail.resendDomainId
    if (!identity) return mail
    const slugFromDomain =
      identity.match(/^mail\.([^.]+)\./)?.[1] ||
      mail.sendingDomain.match(/^mail\.([^.]+)\./)?.[1] ||
      'event'
    const configurationSetName =
      mail.configurationSetName || eventConfigurationSetName(slugFromDomain)
    try {
      const status = await getSesIdentityStatus(identity)
      if (status.verified) {
        return {
          ...mail,
          sendingDomain: identity,
          configurationSetName,
          status: 'verified',
          lastError: '',
          verifiedAt: mail.verifiedAt || new Date().toISOString(),
        }
      }
      return {
        ...mail,
        sendingDomain: identity,
        configurationSetName,
        status: 'pending',
        lastError:
          status.error ||
          `Aguardando verificação DNS/DKIM no SES (${identity}).`,
      }
    } catch (error) {
      return {
        ...mail,
        configurationSetName,
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
