import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import { getEvent, updateEvent } from '@/lib/platform/store'
import { attachCustomHost, verifyCustomHost } from '@/lib/platform/custom-domain'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  const body = (await request.json().catch(() => null)) as { host?: string; verify?: boolean } | null
  if (body?.verify) {
    const status = await verifyCustomHost(event)
    const updated = await updateEvent(id, {
      config: {
        ...event.config,
        domain: { ...event.config.domain, customHostStatus: status },
      },
    })
    return NextResponse.json({ event: updated })
  }
  const result = await attachCustomHost(event, body?.host || '')
  if (!result.host && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  const updated = await updateEvent(id, {
    config: {
      ...event.config,
      domain: {
        ...event.config.domain,
        customHost: result.host,
        customHostStatus: result.status,
      },
    },
  })
  return NextResponse.json({ event: updated, hint: result.error || null })
}
