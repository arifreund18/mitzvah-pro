import { GetEmailIdentityCommand, type DkimAttributes } from '@aws-sdk/client-sesv2'
import { awsRegion, getSesClient } from '@/lib/email/send'

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
  // Prefer domain identity (shared domain mode)
  return bare.slice(at + 1)
}

function dkimCnames(identity: string, tokens: string[]): SesDnsRecord[] {
  return tokens.map((token) => ({
    type: 'CNAME',
    name: `${token}._domainkey.${identity}`,
    value: `${token}.dkim.amazonses.com`,
    purpose: 'dkim' as const,
  }))
}

function recommendedDns(identity: string, dkim: DkimAttributes | undefined): SesDnsRecord[] {
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

/** Read-only check of an SES email/domain identity (does not create resources). */
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
