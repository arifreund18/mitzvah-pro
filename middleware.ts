import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

function barBeniOrigin(): string | null {
  return process.env.BAR_BENI_ORIGIN?.replace(/\/$/, '') ?? null
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
  matcher: ['/', '/pt', '/pt/:path*', '/BarBeni', '/BarBeni/:path*', '/api/:path*'],
}
