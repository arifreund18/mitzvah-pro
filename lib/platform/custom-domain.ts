import { resolveCname, resolveTxt } from 'node:dns/promises'
import { SITE_HOST } from '@/lib/platform/site-url'
import { addDomainToVercelProject } from '@/lib/platform/vercel-project'
import type { CustomHostStatus, PlatformEvent } from '@/lib/platform/types'

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
