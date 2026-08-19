import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import { getEvent } from '@/lib/platform/store'
import { provisionEventSiteDomain } from '@/lib/platform/provision-site'

type Ctx = { params: Promise<{ id: string }> }

export const maxDuration = 30

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  const site = await provisionEventSiteDomain(event.slug)
  return NextResponse.json({ site })
}
