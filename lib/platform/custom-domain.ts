import { resolveCname, resolveTxt } from 'node:dns/promises'
import { SITE_HOST } from '@/lib/platform/site-url'
import type { CustomHostStatus, PlatformEvent } from '@/lib/platform/types'

function vercelToken() {
  return process.env.VERCEL_DNS_TOKEN || process.env.VERCEL_TOKEN || ''
}

function teamQuery(): string {
  const team = process.env.VERCEL_TEAM_ID || ''
  if (team.startsWith('team_')) return `?teamId=${encodeURIComponent(team)}`
  if (team) return `?slug=${encodeURIComponent(team)}`
  return ''
}

function normalizeHost(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '')
}

export function customHostOf(event: PlatformEvent): string {
  return event.config.domain.customHost || ''
}

async function addDomainToVercelProject(host: string): Promise<string> {
  const token = vercelToken()
  if (!token) return 'Adicione o domínio no projeto Vercel (ou configure VERCEL_TOKEN).'
  const project = process.env.VERCEL_PROJECT_ID || 'mitzvah-pro'
  const res = await fetch(`https://api.vercel.com/v10/projects/${project}/domains${teamQuery()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: host }),
  })
  const body = (await res.json().catch(() => null)) as { error?: { message?: string }; name?: string } | null
  if (res.status === 409) return ''
  if (!res.ok) return body?.error?.message || `Vercel domains HTTP ${res.status}`
  return ''
}

async function dnsVerified(host: string, token: string): Promise<boolean> {
  try {
    const cnames = await resolveCname(host)
    if (cnames.some((item) => item.includes('vercel-dns.com') || item.includes(SITE_HOST))) return true
  } catch {
    /* try TXT */
  }
  try {
    const txt = await resolveTxt(host)
    const flat = txt.map((row) => row.join(''))
    if (flat.some((row) => row === `mitzvah-site=${token}` || row.includes(`mitzvah-site=${token}`))) {
      return true
    }
  } catch {
    /* ignore */
  }
  try {
    const www = host.startsWith('www.') ? host : `www.${host}`
    const cnames = await resolveCname(www)
    if (cnames.some((item) => item.includes('vercel-dns.com') || item.includes(SITE_HOST))) return true
  } catch {
    /* ignore */
  }
  return false
}

export async function attachCustomHost(
  event: PlatformEvent,
  rawHost: string,
): Promise<{ host: string; status: CustomHostStatus; error: string }> {
  const host = normalizeHost(rawHost)
  if (!host || host.includes(' ')) {
    return { host: '', status: 'none', error: 'Domínio inválido' }
  }
  if (host === SITE_HOST || host.endsWith(`.${SITE_HOST}`)) {
    return { host: '', status: 'none', error: 'Use um domínio próprio, não mitzvah.pro' }
  }
  const vercelError = await addDomainToVercelProject(host)
  const verified = await dnsVerified(host, event.config.domain.customHostToken)
  return {
    host,
    status: verified ? 'verified' : 'pending',
    error: verified ? '' : vercelError || 'Aponte CNAME para cname.vercel-dns.com e volte a verificar',
  }
}

export async function verifyCustomHost(event: PlatformEvent): Promise<CustomHostStatus> {
  const host = event.config.domain.customHost
  if (!host) return 'none'
  return (await dnsVerified(host, event.config.domain.customHostToken)) ? 'verified' : 'failed'
}
