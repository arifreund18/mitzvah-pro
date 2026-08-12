import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
import { updateEvent } from '@/lib/platform/store'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
  const event = await updateEvent(id, { status: 'archived' })
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ event })
}
