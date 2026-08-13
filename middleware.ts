import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import {
  apexHost,
  eventPublicUrl,
  eventSlugFromHost,
  isBarBeniSubdomain,
  isReservedSlug,
  protocolFor,
  supportsEventSubdomain,
} from './lib/platform/site-url'

const intlMiddleware = createMiddleware(routing)

function barBeniOrigin(): string | null {
  return process.env.BAR_BENI_ORIGIN?.replace(/\/$/, '') ?? null
}

/** Paths of the separate bar-beni app, proxied under /BarBeni. Never /admin on the apex. */
function barBeniEventPath(pathname: string): string | null {
  const eventPage = pathname.match(
    /^\/(en|pt)\/(invite|rsvp|card|std|privacy|terms)(\/|$)/,
  )
  if (eventPage) return `/BarBeni${pathname}`
  return null
}

function requestHost(request: NextRequest): string {
  return request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
}

function rewriteToEvent(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.rewrite(url)
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = requestHost(request)

  if (isBarBeniSubdomain(host)) {
    const path = pathname === '/' || pathname === '' ? '/BarBeni/en' : pathname
    const dest = `${protocolFor(host)}://${apexHost(host)}${path}${request.nextUrl.search}`
    return NextResponse.redirect(dest)
  }

  const eventSlug = eventSlugFromHost(host)

  if (eventSlug) {
    if (pathname.startsWith('/dashboard')) {
      const dest = `${protocolFor(host)}://${apexHost(host)}${pathname}${request.nextUrl.search}`
      return NextResponse.redirect(dest)
    }
    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      return NextResponse.next()
    }
    if (pathname === '/std' || pathname.startsWith('/std/')) {
      return rewriteToEvent(request, `/e/${eventSlug}/std`)
    }
    if (pathname === '/invite' || pathname.startsWith('/invite/')) {
      return rewriteToEvent(request, `/e/${eventSlug}/invite`)
    }
    if (pathname === '/' || pathname === '' || pathname.startsWith(`/e/${eventSlug}`)) {
      if (pathname === '/' || pathname === '') {
        return rewriteToEvent(request, `/e/${eventSlug}`)
      }
      return NextResponse.next()
    }
    return rewriteToEvent(request, `/e/${eventSlug}`)
  }

  if (pathname.startsWith('/e/')) {
    const parts = pathname.split('/').filter(Boolean)
    const slug = parts[1]
    if (slug && !isReservedSlug(slug) && supportsEventSubdomain(host)) {
      const rest = parts.slice(2).join('/')
      const dest = new URL(eventPublicUrl(slug, rest ? `/${rest}` : '', { host }))
      dest.search = request.nextUrl.search
      return NextResponse.redirect(dest, 308)
    }
    return NextResponse.next()
  }

  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api/platform') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/approve/')
  ) {
    return NextResponse.next()
  }

  const barBeniPath = barBeniEventPath(pathname)
  if (barBeniPath) {
    const url = request.nextUrl.clone()
    url.pathname = barBeniPath
    return NextResponse.redirect(url)
  }

  if (pathname === '/BarBeni' || pathname.startsWith('/BarBeni/')) {
    const origin = barBeniOrigin()
    if (!origin) {
      return new NextResponse('BAR_BENI_ORIGIN não configurado (repo bar-beni)', { status: 502 })
    }
    const target = new URL(`${pathname}${request.nextUrl.search}`, origin)
    return NextResponse.rewrite(target)
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: [
    '/',
    '/en',
    '/en/:path*',
    '/pt',
    '/pt/:path*',
    '/es',
    '/es/:path*',
    '/he',
    '/he/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/approve',
    '/approve/:path*',
    '/std',
    '/std/:path*',
    '/invite',
    '/invite/:path*',
    '/BarBeni',
    '/BarBeni/:path*',
    '/api/:path*',
  ],
}
