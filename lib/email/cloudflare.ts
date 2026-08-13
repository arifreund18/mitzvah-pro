type CloudflareRecord = {
  id: string
  type: string
  name: string
  content: string
  priority?: number
}

type CloudflareListResponse = {
  success: boolean
  errors?: { message: string }[]
  result?: CloudflareRecord[]
}

type CloudflareMutationResponse = {
  success: boolean
  errors?: { message: string }[]
  result?: CloudflareRecord
}

export type DnsUpsert = {
  type: 'MX' | 'TXT' | 'CNAME' | 'CAA'
  name: string
  content: string
  priority?: number
}

function cloudflareConfig() {
  const token = process.env.CLOUDFLARE_API_TOKEN
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  if (!token || !zoneId) return null
  return { token, zoneId }
}

export function cloudflareConfigured(): boolean {
  return cloudflareConfig() !== null
}

async function cfFetch(path: string, init?: RequestInit): Promise<Response> {
  const cfg = cloudflareConfig()
  if (!cfg) throw new Error('Cloudflare não configurado')
  return fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

function errorMessage(body: { errors?: { message: string }[] }, fallback: string) {
  return body.errors?.map((item) => item.message).filter(Boolean).join('; ') || fallback
}

export async function upsertCloudflareRecord(record: DnsUpsert, comment: string): Promise<void> {
  const cfg = cloudflareConfig()
  if (!cfg) throw new Error('Cloudflare não configurado')

  const query = new URLSearchParams({
    name: record.name,
    type: record.type,
  })
  const listed = (await (
    await cfFetch(`/zones/${cfg.zoneId}/dns_records?${query.toString()}`)
  ).json()) as CloudflareListResponse
  if (!listed.success) {
    throw new Error(errorMessage(listed, 'Falha ao listar DNS no Cloudflare'))
  }

  const payload = {
    type: record.type,
    name: record.name,
    content: record.content,
    ttl: 1,
    proxied: false,
    comment,
    ...(record.type === 'MX' && record.priority != null ? { priority: record.priority } : {}),
  }

  const existing = listed.result?.[0]
  const res = existing
    ? await cfFetch(`/zones/${cfg.zoneId}/dns_records/${existing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    : await cfFetch(`/zones/${cfg.zoneId}/dns_records`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
  const body = (await res.json()) as CloudflareMutationResponse
  if (!body.success) {
    throw new Error(errorMessage(body, `Falha ao gravar ${record.type} ${record.name}`))
  }
}
