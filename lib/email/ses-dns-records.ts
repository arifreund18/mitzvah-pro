export type SesDnsRecord = {
  type: 'CNAME' | 'TXT' | 'MX'
  name: string
  value: string
  purpose: 'dkim' | 'spf' | 'dmarc' | 'other'
}

type DkimTokens = { Tokens?: string[]; Status?: string } | null | undefined

function dkimCnames(identity: string, tokens: string[]): SesDnsRecord[] {
  return tokens.map((token) => ({
    type: 'CNAME' as const,
    name: `${token}._domainkey.${identity}`,
    value: `${token}.dkim.amazonses.com`,
    purpose: 'dkim' as const,
  }))
}

/**
 * DNS for a mail.{slug} identity:
 * - DKIM CNAMEs (required)
 * - DMARC TXT with rua from DMARC_REPORT_EMAIL (optional if unset)
 * SPF TXT on the subdomain is omitted: SES uses its own MAIL FROM / Return-Path,
 * so a subdomain SPF record does not affect bounce domain authentication.
 */
export function recommendedDns(identity: string, dkim: DkimTokens): SesDnsRecord[] {
  const tokens = dkim?.Tokens || []
  const records: SesDnsRecord[] = [...dkimCnames(identity, tokens)]
  const dmarcRua = (process.env.DMARC_REPORT_EMAIL || '').trim()
  if (dmarcRua && dmarcRua.includes('@')) {
    records.push({
      type: 'TXT',
      name: `_dmarc.${identity}`,
      value: `v=DMARC1; p=none; rua=mailto:${dmarcRua}`,
      purpose: 'dmarc',
    })
  }
  return records
}
