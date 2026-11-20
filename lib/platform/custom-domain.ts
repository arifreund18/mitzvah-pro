import { resolveTxt } from 'node:dns/promises'
import { SITE_HOST } from '@/lib/platform/site-url'
import { addDomainToVercelProject } from '@/lib/platform/vercel-project'
import { isCustomHostTaken } from '@/lib/platform/store'
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

/**
 * E2: prove ownership only via TXT `mitzvah-site=<token>`.
 * A CNAME to vercel-dns/mitzvah.pro is not enough — that would verify any
 * domain already pointed at Vercel (including another client's).
 */
export async function dnsVerified(host: string, token: string): Promise<boolean> {
  if (!host || !token) return false
  const candidates = Array.from(
    new Set([host, host.startsWith('www.') ? host.slice(4) : `www.${host}`]),
  )
  for (const candidate of candidates) {
    try {
      const txt = await resolveTxt(candidate)
      const flat = txt.map((row) => row.join(''))
      if (
        flat.some(
          (row) => row === `mitzvah-site=${token}` || row.includes(`mitzvah-site=${token}`),
        )
      ) {
        return true
      }
    } catch {
      /* try next */
    }
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
  const taken = await isCustomHostTaken(host, event.id)
  if (taken) {
    return {
      host: '',
      status: 'none',
      error: 'Este domínio já está ligado a outro evento',
    }
  }
  const vercelError = await addDomainToVercelProject(host)
  const verified = await dnsVerified(host, event.config.domain.customHostToken)
  return {
    host,
    status: verified ? 'verified' : 'pending',
    error: verified
      ? ''
      : vercelError ||
        `Crie o TXT mitzvah-site=${event.config.domain.customHostToken} no domínio e volte a verificar (CNAME para cname.vercel-dns.com só aponta o tráfego)`,
  }
}

export async function verifyCustomHost(event: PlatformEvent): Promise<CustomHostStatus> {
  const host = event.config.domain.customHost
  if (!host) return 'none'
  return (await dnsVerified(host, event.config.domain.customHostToken)) ? 'verified' : 'failed'
}
