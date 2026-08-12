import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

function barBeniOrigin(): string | null {
  return process.env.BAR_BENI_ORIGIN?.replace(/\/$/, '') ?? null
}

/** Paths that belong to the event app (bar-beni), not the landing. */
function barBeniPublicPath(pathname: string): string | null {
  if (pathname.startsWith('/admin')) return `/BarBeni${pathname}`

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return `/BarBeni${pathname}`
  }

  const ptEvent = pathname.match(
    /^\/pt\/(invite|rsvp|card|std|privacy|terms)(\/|$)/,
  )
  if (ptEvent) return `/BarBeni${pathname}`

  return null
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/e/') ||
    pathname.startsWith('/api/platform')
  ) {
    return NextResponse.next()
  }

  const barBeniPath = barBeniPublicPath(pathname)
  if (barBeniPath) {
    const url = request.nextUrl.clone()
    url.pathname = barBeniPath
    return NextResponse.redirect(url)
  }

  if (pathname === '/BarBeni' || pathname.startsWith('/BarBeni/')) {
    const origin = barBeniOrigin()
    if (!origin) {
      return new NextResponse('BAR_BENI_ORIGIN não configurado', { status: 502 })
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
    '/e',
    '/e/:path*',
    '/admin',
    '/admin/:path*',
    '/BarBeni',
    '/BarBeni/:path*',
    '/api/:path*',
  ],
}
