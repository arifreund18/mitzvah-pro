import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
import { getEvent, updateEvent } from '@/lib/platform/store'
import { reviewIssues } from '@/lib/platform/wizard'
import { provisionEventMailDomain } from '@/lib/email/provision-domain'

export const maxDuration = 30

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
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

  const mail = await provisionEventMailDomain(published.config)
  const event = await updateEvent(id, {
    config: {
      ...published.config,
      domain: { ...published.config.domain, mail },
    },
  })
  return NextResponse.json({ event })
}
