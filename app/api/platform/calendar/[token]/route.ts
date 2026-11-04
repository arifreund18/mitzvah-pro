import { NextResponse } from 'next/server'
import { getFamilyByToken } from '@/lib/platform/store'
import { google, icsContent, outlook } from '@/lib/platform/calendar'
import { eventPublicUrl } from '@/lib/platform/site-url'

type Ctx = { params: Promise<{ token: string }> }

export async function GET(request: Request, ctx: Ctx) {
  const { token } = await ctx.params
  const found = await getFamilyByToken(token)
  if (!found) return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const to = (searchParams.get('to') || '').toLowerCase()
  const config = found.event.config

  if (to === 'google') {
    const href = google(config)
    if (!href) return NextResponse.json({ error: 'Data do evento em falta' }, { status: 400 })
    return NextResponse.redirect(href)
  }
  if (to === 'outlook') {
    const href = outlook(config)
    if (!href) return NextResponse.json({ error: 'Data do evento em falta' }, { status: 400 })
    return NextResponse.redirect(href)
  }

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    new URL(request.url).host
  const siteUrl = eventPublicUrl(found.event.slug, '', { host })
  const body = icsContent(config, { url: siteUrl })
  if (!body) return NextResponse.json({ error: 'Data do evento em falta' }, { status: 400 })

  const filename = `${found.event.slug || 'event'}.ics`
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
