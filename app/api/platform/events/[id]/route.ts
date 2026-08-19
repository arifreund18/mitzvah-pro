import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import { platformApiError } from '@/lib/platform/api-error'
import { getEvent, updateEvent, deleteEvent } from '@/lib/platform/store'
import type { EventConfig, WizardProgress } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ event })
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const body = (await request.json().catch(() => null)) as {
    config?: EventConfig
    wizard?: Partial<WizardProgress>
    slug?: string
  } | null
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  try {
    const event = await updateEvent(id, body)
    if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    return NextResponse.json({ event })
  } catch (error) {
    return platformApiError(error, 'Não foi possível atualizar o evento')
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  try {
    const ok = await deleteEvent(id)
    if (!ok) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return platformApiError(error, 'Não foi possível apagar o evento')
  }
}
