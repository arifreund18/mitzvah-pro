import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
import { getEvent, updateEvent } from '@/lib/platform/store'
import { provisionEventMailDomain } from '@/lib/email/provision-domain'

type Ctx = { params: Promise<{ id: string }> }

export const maxDuration = 30

export async function POST(_request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
  const current = await getEvent(id)
  if (!current) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const mail = await provisionEventMailDomain(current.config)
  const event = await updateEvent(id, {
    config: {
      ...current.config,
      domain: { ...current.config.domain, mail },
    },
  })
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  if (mail.status === 'failed') {
    return NextResponse.json(
      {
        error: mail.lastError || 'Falha ao provisionar domínio de email',
        event,
        mail,
      },
      { status: 502 },
    )
  }

  return NextResponse.json({ event, mail })
}
