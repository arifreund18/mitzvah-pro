import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import { getEvent, updateEvent } from '@/lib/platform/store'
import { reviewIssues } from '@/lib/platform/wizard'
import { provisionEventMailDomain } from '@/lib/email/provision-domain'
import { provisionEventSiteDomain } from '@/lib/platform/provision-site'

export const maxDuration = 30

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const current = await getEvent(id)
  if (!current) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  const issues = reviewIssues(current.config)
  if (issues.length) {
    return NextResponse.json({ error: 'Complete os campos obrigatórios', issues }, { status: 400 })
  }

  const published = await updateEvent(id, {
    status: 'published',
    slug: current.config.domain.slug,
  })
  if (!published) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const [mail, site] = await Promise.all([
    provisionEventMailDomain(published.config),
    provisionEventSiteDomain(published.slug),
  ])
  const event = await updateEvent(id, {
    config: {
      ...published.config,
      domain: { ...published.config.domain, mail },
    },
  })
  return NextResponse.json({ event, site })
}
