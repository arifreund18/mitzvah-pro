export const SITE_HOST = process.env.NEXT_PUBLIC_SITE_HOST || 'mitzvah.pro'

/** Hosts that belong to the live BarBeni event, not the studio template. */
export const BARBENI_SUBDOMAINS = new Set(['beni', 'barbeni', 'bar-beni', 'barbini'])

export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'www2',
  'app',
  'api',
  'admin',
  'dashboard',
  'studio',
  'mail',
  'email',
  'cdn',
  'static',
  'assets',
  'preview',
  'by-host',
  'staging',
  'dev',
  'test',
  'login',
  'auth',
  'account',
  'accounts',
  'platform',
  'status',
  'docs',
  'help',
  'support',
  'ns',
  'ns1',
  'ns2',
  'mx',
  'smtp',
  'imap',
  'ftp',
  'git',
  'vercel',
  'next',
  'mitzvah',
  'm',
  'mobile',
  'en',
  'pt',
  'es',
  'he',
  ...BARBENI_SUBDOMAINS,
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SUBDOMAINS.has(slug.toLowerCase())
}

export function hostnameOf(host: string): string {
  return host.split(':')[0].toLowerCase()
}

export function portSuffix(host: string): string {
  const hostname = hostnameOf(host)
  if (host.length <= hostname.length) return ''
  const rest = host.slice(hostname.length)
  return /^\d+$/.test(rest.slice(1)) ? rest : ''
}

export function isVercelPreviewHost(host: string): boolean {
  return hostnameOf(host).endsWith('.vercel.app')
}

export function isIpHost(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostnameOf(host))
}

function defaultHost(): string {
  if (typeof window !== 'undefined') return window.location.host
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return process.env.VERCEL_URL
  }
  if (process.env.NODE_ENV !== 'production') return 'localhost:3000'
  return SITE_HOST
}

export function hostFromHeaders(headers: { get(name: string): string | null }): string {
  return headers.get('x-forwarded-host') || headers.get('host') || defaultHost()
}

export function protocolFor(host: string): string {
  const hostname = hostnameOf(host)
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || isIpHost(host)) {
    return 'http'
  }
  return 'https'
}

export function subdomainLabelFromHost(host: string): string | null {
  const hostname = hostnameOf(host)
  if (hostname.endsWith('.localhost')) {
    const slug = hostname.slice(0, -'.localhost'.length)
    if (!slug || slug.includes('.')) return null
    return slug
  }
  if (hostname.endsWith(`.${SITE_HOST}`)) {
    const slug = hostname.slice(0, -(SITE_HOST.length + 1))
    if (!slug || slug.includes('.')) return null
    return slug
  }
  return null
}

export function eventSlugFromHost(host: string): string | null {
  const slug = subdomainLabelFromHost(host)
  if (!slug || isReservedSlug(slug)) return null
  return slug
}

export function isBarBeniSubdomain(host: string): boolean {
  const slug = subdomainLabelFromHost(host)
  return !!slug && BARBENI_SUBDOMAINS.has(slug)
}

export function supportsEventSubdomain(host: string): boolean {
  if (isVercelPreviewHost(host) || isIpHost(host)) return false
  const hostname = hostnameOf(host)
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true
  if (hostname === SITE_HOST || hostname === `www.${SITE_HOST}` || hostname.endsWith(`.${SITE_HOST}`)) {
    return true
  }
  return false
}

export function isPlatformManagedHost(host: string): boolean {
  const hostname = hostnameOf(host)
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true
  if (isVercelPreviewHost(host) || isIpHost(host)) return true
  if (hostname === SITE_HOST || hostname === `www.${SITE_HOST}` || hostname.endsWith(`.${SITE_HOST}`)) {
    return true
  }
  return false
}

export function apexHost(host: string): string {
  const port = portSuffix(host)
  const hostname = hostnameOf(host)
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return `localhost${port}`
  if (hostname === SITE_HOST || hostname.endsWith(`.${SITE_HOST}`)) return `${SITE_HOST}${port}`
  return host
}

export function eventPublicUrl(slug: string, path = '', opts?: { host?: string }): string {
  const host = opts?.host || defaultHost()
  const hashIndex = path.indexOf('#')
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : ''
  const rawPath = hashIndex >= 0 ? path.slice(0, hashIndex) : path
  const suffix = !rawPath || rawPath === '/' ? '' : rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const proto = protocolFor(host)

  if (!supportsEventSubdomain(host) || isReservedSlug(slug)) {
    return `${proto}://${host}/e/${slug}${suffix}${hash}`
  }

  const port = portSuffix(host)
  const apex = hostnameOf(apexHost(host))
  return `${proto}://${slug}.${apex}${port}${suffix}${hash}`
}

export function eventPublicHostLabel(slug: string, opts?: { host?: string }): string {
  return eventPublicUrl(slug, '', opts).replace(/^https?:\/\//, '')
}
