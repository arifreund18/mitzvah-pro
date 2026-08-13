import { SITE_HOST } from '@/lib/platform/site-url'

export type DnsUpsert = {
  type: 'MX' | 'TXT' | 'CNAME' | 'CAA'
  name: string
  content: string
  priority?: number
}

type VercelDnsRecord = {
  id: string
  name: string
  type: string
  value: string
  mxPriority?: number
}

type VercelListResponse = {
  records?: VercelDnsRecord[]
  error?: { message?: string; code?: string }
}

type VercelMutationResponse = {
  uid?: string
  error?: { message?: string; code?: string }
}

function vercelConfig() {
  const token = process.env.VERCEL_DNS_TOKEN || process.env.VERCEL_TOKEN
  if (!token) return null
  return {
    token,
    domain: process.env.VERCEL_DNS_DOMAIN || SITE_HOST,
    teamId: process.env.VERCEL_TEAM_ID || '',
  }
}

export function vercelDnsConfigured(): boolean {
  return vercelConfig() !== null
}

function teamQuery(extra?: Record<string, string>): string {
  const cfg = vercelConfig()
  const params = new URLSearchParams(extra)
  if (cfg?.teamId) params.set('teamId', cfg.teamId)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

async function vercelFetch(path: string, init?: RequestInit): Promise<Response> {
  const cfg = vercelConfig()
  if (!cfg) throw new Error('Vercel DNS não configurado')
  return fetch(`https://api.vercel.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

function relativeName(fqdn: string, apex: string): string {
  const host = fqdn.replace(/\.$/, '').toLowerCase()
  const zone = apex.toLowerCase()
  if (host === zone) return ''
  if (host.endsWith(`.${zone}`)) return host.slice(0, -(zone.length + 1))
  return host
}

async function listRecords(): Promise<VercelDnsRecord[]> {
  const cfg = vercelConfig()
  if (!cfg) throw new Error('Vercel DNS não configurado')
  const records: VercelDnsRecord[] = []
  let until: string | undefined
  for (let page = 0; page < 10; page += 1) {
    const extra: Record<string, string> = { limit: '100' }
    if (until) extra.until = until
    const res = await vercelFetch(`/v5/domains/${cfg.domain}/records${teamQuery(extra)}`)
    const body = (await res.json()) as VercelListResponse
    if (!res.ok) {
      throw new Error(body.error?.message || 'Falha ao listar DNS na Vercel')
    }
    const batch = body.records || []
    records.push(...batch)
    if (batch.length < 100) break
    const last = batch[batch.length - 1] as VercelDnsRecord & { createdAt?: number }
    if (!last?.createdAt) break
    until = String(last.createdAt)
  }
  return records
}

export async function upsertVercelRecord(record: DnsUpsert, comment: string): Promise<void> {
  const cfg = vercelConfig()
  if (!cfg) throw new Error('Vercel DNS não configurado')

  const name = relativeName(record.name, cfg.domain)
  const existing = (await listRecords()).find(
    (item) => item.type === record.type && item.name === name,
  )

  const payload: Record<string, string | number> = {
    type: record.type,
    name,
    value: record.content.replace(/\.$/, ''),
    ttl: 60,
    comment,
  }
  if (record.type === 'MX' && record.priority != null) {
    payload.mxPriority = record.priority
  }

  if (existing) {
    const res = await vercelFetch(`/v1/domains/records/${existing.id}${teamQuery()}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    const body = (await res.json()) as VercelMutationResponse
    if (!res.ok) {
      throw new Error(body.error?.message || `Falha ao atualizar ${record.type} ${name}`)
    }
    return
  }

  const res = await vercelFetch(`/v2/domains/${cfg.domain}/records${teamQuery()}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const body = (await res.json()) as VercelMutationResponse
  if (!res.ok) {
    throw new Error(body.error?.message || `Falha ao criar ${record.type} ${name}`)
  }
}
