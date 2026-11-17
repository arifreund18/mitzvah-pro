import {
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  type DkimAttributes,
} from '@aws-sdk/client-sesv2'
import { awsRegion, getSesClient } from '@/lib/email/send'
import type { DnsUpsert } from '@/lib/email/vercel-dns'

export type SesDnsRecord = {
  type: 'CNAME' | 'TXT' | 'MX'
  name: string
  value: string
  purpose: 'dkim' | 'spf' | 'dmarc' | 'other'
}

export type SesIdentityStatus = {
  identity: string
  region: string
  verified: boolean
  verificationStatus: string
  dkimStatus: string
  dkimTokens: string[]
  dnsRecords: SesDnsRecord[]
  error?: string
}

export function emailIdentityFromAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  const bare = (match?.[1] || from).trim().toLowerCase()
  const at = bare.lastIndexOf('@')
  if (at === -1) return bare
  return bare.slice(at + 1)
}

function dkimCnames(identity: string, tokens: string[]): SesDnsRecord[] {
  return tokens.map((token) => ({
    type: 'CNAME' as const,
    name: `${token}._domainkey.${identity}`,
    value: `${token}.dkim.amazonses.com`,
    purpose: 'dkim' as const,
  }))
}

export function recommendedDns(identity: string, dkim: DkimAttributes | undefined): SesDnsRecord[] {
  const tokens = dkim?.Tokens || []
  const records: SesDnsRecord[] = [...dkimCnames(identity, tokens)]
  records.push({
    type: 'TXT',
    name: identity,
    value: 'v=spf1 include:amazonses.com ~all',
    purpose: 'spf',
  })
  records.push({
    type: 'TXT',
    name: `_dmarc.${identity}`,
    value: `v=DMARC1; p=none; rua=mailto:dmarc@${identity}`,
    purpose: 'dmarc',
  })
  return records
}

export function sesDnsToUpserts(records: SesDnsRecord[]): DnsUpsert[] {
  return records
    .filter((r) => r.type === 'CNAME' || r.type === 'TXT' || r.type === 'MX')
    .map((r) => ({
      type: r.type,
      name: r.name,
      content: r.value,
    }))
}

/** Read-only check of an SES email/domain identity. */
export async function getSesIdentityStatus(identity: string): Promise<SesIdentityStatus> {
  const region = awsRegion()
  const base: SesIdentityStatus = {
    identity,
    region,
    verified: false,
    verificationStatus: 'unknown',
    dkimStatus: 'unknown',
    dkimTokens: [],
    dnsRecords: [],
  }
  const client = getSesClient()
  if (!client) {
    return { ...base, error: 'AWS credentials ausentes' }
  }
  try {
    const out = await client.send(new GetEmailIdentityCommand({ EmailIdentity: identity }))
    const dkim = out.DkimAttributes
    const tokens = dkim?.Tokens || []
    const verified = Boolean(out.VerifiedForSendingStatus)
    return {
      identity,
      region,
      verified,
      verificationStatus: verified ? 'SUCCESS' : out.VerificationStatus || 'PENDING',
      dkimStatus: dkim?.Status || 'NOT_STARTED',
      dkimTokens: tokens,
      dnsRecords: recommendedDns(identity, dkim),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar identidade SES'
    return { ...base, error: message, verificationStatus: 'NOT_FOUND' }
  }
}

/**
 * Ensure a domain identity exists (Easy DKIM). Creates if missing.
 * Requires IAM: ses:CreateEmailIdentity, ses:GetEmailIdentity.
 */
export async function ensureSesDomainIdentity(domain: string): Promise<SesIdentityStatus> {
  const client = getSesClient()
  if (!client) {
    return {
      identity: domain,
      region: awsRegion(),
      verified: false,
      verificationStatus: 'NOT_FOUND',
      dkimStatus: 'NOT_STARTED',
      dkimTokens: [],
      dnsRecords: [],
      error: 'AWS credentials ausentes',
    }
  }

  const existing = await getSesIdentityStatus(domain)
  if (!existing.error || existing.verificationStatus !== 'NOT_FOUND') {
    if (!existing.error) return existing
    // AccessDenied or other — surface it
    if (!/not found|NotFound|does not exist/i.test(existing.error || '')) {
      return existing
    }
  }

  try {
    const created = await client.send(
      new CreateEmailIdentityCommand({
        EmailIdentity: domain,
        Tags: [
          { Key: 'app', Value: 'mitzvah-pro' },
          { Key: 'purpose', Value: 'event-mail-isolation' },
        ],
      }),
    )
    const dkim = created.DkimAttributes
    const tokens = dkim?.Tokens || []
    // Re-fetch for VerifiedForSendingStatus
    const refreshed = await getSesIdentityStatus(domain)
    if (!refreshed.error) return refreshed
    return {
      identity: domain,
      region: awsRegion(),
      verified: false,
      verificationStatus: 'PENDING',
      dkimStatus: dkim?.Status || 'PENDING',
      dkimTokens: tokens,
      dnsRecords: recommendedDns(domain, dkim),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao criar identidade SES'
    // Race: already created
    if (/already exists|AlreadyExists/i.test(message)) {
      return getSesIdentityStatus(domain)
    }
    return {
      identity: domain,
      region: awsRegion(),
      verified: false,
      verificationStatus: 'FAILED',
      dkimStatus: 'FAILED',
      dkimTokens: [],
      dnsRecords: [],
      error: message,
    }
  }
}
