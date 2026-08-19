import { upsertVercelRecord, vercelDnsConfigured } from '@/lib/email/vercel-dns'
import { SITE_HOST } from '@/lib/platform/site-url'
import { addDomainToVercelProject } from '@/lib/platform/vercel-project'

export type SiteDomainStatus = 'skipped' | 'pending' | 'verified' | 'failed'

export type EventSiteDomain = {
  host: string
  status: SiteDomainStatus
  lastError: string
}

export function eventSiteHost(slug: string): string {
  return `${slug}.${SITE_HOST}`
}

export async function provisionEventSiteDomain(slug: string): Promise<EventSiteDomain> {
  const host = eventSiteHost(slug)

  if (!vercelDnsConfigured()) {
    return {
      host,
      status: 'skipped',
      lastError:
        'Vercel DNS não configurado — o site fica em mitzvah.pro/e/' +
        slug +
        ' até configurar VERCEL_TOKEN.',
    }
  }

  try {
    await upsertVercelRecord(
      { type: 'CNAME', name: host, content: 'cname.vercel-dns.com' },
      `mitzvah-site:${slug}`,
    )
    const projectError = await addDomainToVercelProject(host)
    if (projectError) {
      return {
        host,
        status: 'pending',
        lastError: `DNS criado; projeto Vercel: ${projectError}`,
      }
    }
    return {
      host,
      status: 'pending',
      lastError: 'DNS criado; propagação pode levar alguns minutos.',
    }
  } catch (error) {
    return {
      host,
      status: 'failed',
      lastError: error instanceof Error ? error.message : 'Falha ao provisionar subdomínio do site',
    }
  }
}
