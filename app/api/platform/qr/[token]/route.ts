import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getFamilyByToken } from '@/lib/platform/store'
import { eventPublicUrl } from '@/lib/platform/site-url'

type Ctx = { params: Promise<{ token: string }> }

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
  const format = new URL(request.url).searchParams.get('format') || 'svg'

  if (format === 'png') {
    const png = await QRCode.toBuffer(url, {
      type: 'png',
      width: 480,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#111111', light: '#ffffff' },
  })
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
