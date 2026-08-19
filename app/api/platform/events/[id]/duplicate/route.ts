import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import { duplicateEvent } from '@/lib/platform/store'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await duplicateEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ event })
}
