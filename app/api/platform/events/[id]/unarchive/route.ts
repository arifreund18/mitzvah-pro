import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import { getEvent, updateEvent } from '@/lib/platform/store'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const current = await getEvent(id)
  if (!current) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  const status = current.publishedAt ? 'published' : 'draft'
  const event = await updateEvent(id, { status })
  return NextResponse.json({ event })
}
