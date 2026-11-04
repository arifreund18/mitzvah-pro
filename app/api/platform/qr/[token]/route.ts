import { NextResponse } from 'next/server'
import { getFamilyByToken } from '@/lib/platform/store'
import { eventPublicUrl } from '@/lib/platform/site-url'

type Ctx = { params: Promise<{ token: string }> }

/** Simple SVG QR-like badge (URL encoded). For production-grade QR, swap to a QR library later. */
export async function GET(request: Request, ctx: Ctx) {
  const { token } = await ctx.params
  const found = await getFamilyByToken(token)
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    process.env.NEXT_PUBLIC_SITE_HOST ||
    'mitzvah.pro'
  const url = eventPublicUrl(found.event.slug, `/card/${token}`, { host })
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#fff"/>
  <rect x="16" y="16" width="64" height="64" fill="#111"/>
  <rect x="160" y="16" width="64" height="64" fill="#111"/>
  <rect x="16" y="160" width="64" height="64" fill="#111"/>
  <rect x="28" y="28" width="40" height="40" fill="#fff"/>
  <rect x="172" y="28" width="40" height="40" fill="#fff"/>
  <rect x="28" y="172" width="40" height="40" fill="#fff"/>
  <rect x="40" y="40" width="16" height="16" fill="#111"/>
  <rect x="184" y="40" width="16" height="16" fill="#111"/>
  <rect x="40" y="184" width="16" height="16" fill="#111"/>
  <text x="120" y="130" text-anchor="middle" font-size="10" fill="#333">${url.slice(0, 42)}</text>
</svg>`
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
