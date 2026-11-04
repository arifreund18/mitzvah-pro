import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import {
  apexHost,
  eventSlugFromHost,
  isBarBeniSubdomain,
  isPlatformManagedHost,
  protocolFor,
} from './lib/platform/site-url'

const intlMiddleware = createMiddleware(routing)

const GUEST_TOKEN_COOKIE = 'mitzvah_guest_token'

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

function extractGuestToken(pathname: string, searchParams: URLSearchParams): string | null {
  const fromQuery = searchParams.get('token')?.trim()
  if (fromQuery) return fromQuery
  const match = pathname.match(/^\/(?:rsvp|card|std|invite)\/([^/]+)\/?$/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function withGuestCookie(response: NextResponse, token: string | null): NextResponse {
  if (token) {
    response.cookies.set(GUEST_TOKEN_COOKIE, token, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 180,
      httpOnly: false,
    })
  }
  return response
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

    const guestToken = extractGuestToken(pathname, request.nextUrl.searchParams)

    const rsvpToken = pathname.match(/^\/rsvp\/([^/]+)\/?$/)
    if (rsvpToken) {
      return withGuestCookie(
        rewriteToEvent(request, `/e/${eventSlug}/rsvp/${rsvpToken[1]}`),
        guestToken,
      )
    }

    const cardToken = pathname.match(/^\/card\/([^/]+)\/?$/)
    if (cardToken) {
      return withGuestCookie(
        rewriteToEvent(request, `/e/${eventSlug}/card/${cardToken[1]}`),
        guestToken,
      )
    }

    // Token path takes precedence over bare /std
    const stdToken = pathname.match(/^\/std\/([^/]+)\/?$/)
    if (stdToken) {
      return withGuestCookie(
        rewriteToEvent(request, `/e/${eventSlug}/std/${stdToken[1]}`),
        guestToken,
      )
    }

    const inviteToken = pathname.match(/^\/invite\/([^/]+)\/?$/)
    if (inviteToken) {
      return withGuestCookie(
        rewriteToEvent(request, `/e/${eventSlug}/invite/${inviteToken[1]}`),
        guestToken,
      )
    }

    if (pathname === '/std' || pathname.startsWith('/std/')) {
      return withGuestCookie(rewriteToEvent(request, `/e/${eventSlug}/std`), guestToken)
    }
    if (pathname === '/invite' || pathname.startsWith('/invite/')) {
      return withGuestCookie(rewriteToEvent(request, `/e/${eventSlug}/invite`), guestToken)
    }
    if (pathname === '/rsvp' || pathname.startsWith('/rsvp/')) {
      return withGuestCookie(rewriteToEvent(request, `/e/${eventSlug}`), guestToken)
    }
    if (pathname === '/card' || pathname.startsWith('/card/')) {
      return withGuestCookie(rewriteToEvent(request, `/e/${eventSlug}/invite`), guestToken)
    }
    if (pathname === '/privacy' || pathname.startsWith('/privacy/')) {
      return rewriteToEvent(request, `/e/${eventSlug}/privacy`)
    }
    if (pathname === '/terms' || pathname.startsWith('/terms/')) {
      return rewriteToEvent(request, `/e/${eventSlug}/terms`)
    }

    if (pathname === '/' || pathname === '' || pathname.startsWith(`/e/${eventSlug}`)) {
      if (pathname === '/' || pathname === '') {
        return withGuestCookie(rewriteToEvent(request, `/e/${eventSlug}`), guestToken)
      }
      return withGuestCookie(NextResponse.next(), guestToken)
    }
    return withGuestCookie(rewriteToEvent(request, `/e/${eventSlug}`), guestToken)
  }

  if (!isPlatformManagedHost(host)) {
    if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/dashboard')) {
      return NextResponse.next()
    }
    const rest = pathname === '/' || pathname === '' ? '' : pathname
    return rewriteToEvent(request, `/e/by-host${rest}`)
  }

  if (pathname.startsWith('/e/')) {
    const tokenOnApex = pathname.match(/^\/e\/[^/]+\/(?:rsvp|card|std|invite)\/([^/]+)\/?$/)
    const guestToken =
      tokenOnApex?.[1] || request.nextUrl.searchParams.get('token')?.trim() || null
    return withGuestCookie(NextResponse.next(), guestToken)
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
    '/rsvp',
    '/rsvp/:path*',
    '/card',
    '/card/:path*',
    '/privacy',
    '/privacy/:path*',
    '/terms',
    '/terms/:path*',
    '/BarBeni',
    '/BarBeni/:path*',
    '/e',
    '/e/:path*',
    '/api/:path*',
  ],
}
