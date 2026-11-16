import { NextResponse } from 'next/server'
import { canManageEventOptions } from '@/lib/platform/auth'
import { platformApiError } from '@/lib/platform/api-error'
import { currentActor, requireEventAccess } from '@/lib/platform/session'
import { getEvent, updateEvent, deleteEvent } from '@/lib/platform/store'
import type { EventConfig, WizardProgress } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

/** Members may edit content, but not products / enabled languages (owner-only). */
function lockOwnerOnlyOptions(incoming: EventConfig, existing: EventConfig): EventConfig {
  return {
    ...incoming,
    products: existing.products,
    productMode: existing.productMode,
    locales: {
      ...incoming.locales,
      enabled: existing.locales.enabled,
      default: existing.locales.enabled.includes(incoming.locales.default)
        ? incoming.locales.default
        : existing.locales.default,
    },
    saveTheDate: {
      ...incoming.saveTheDate,
      // Keep send toggle editable; product inclusion stays with the owner.
    },
  }
}

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
    const actor = await currentActor()
    if (body.config && !canManageEventOptions(actor)) {
      const existing = await getEvent(id)
      if (!existing) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
      body.config = lockOwnerOnlyOptions(body.config, existing.config)
    }
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
