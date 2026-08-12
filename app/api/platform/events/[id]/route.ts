import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
import { getEvent, updateEvent, deleteEvent } from '@/lib/platform/store'
import type { EventConfig, WizardProgress } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ event })
}

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as {
    config?: EventConfig
    wizard?: Partial<WizardProgress>
    slug?: string
  } | null
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const event = await updateEvent(id, body)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ event })
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
  const ok = await deleteEvent(id)
  if (!ok) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
