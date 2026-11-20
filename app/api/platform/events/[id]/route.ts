import { NextResponse } from 'next/server'
import { canManageEventOptions } from '@/lib/platform/auth'
import { platformApiError } from '@/lib/platform/api-error'
import { currentActor, requireEventAccess } from '@/lib/platform/session'
import { getEvent, updateEvent, deleteEvent, StaleWriteError } from '@/lib/platform/store'
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

/**
 * E1: mail + custom host are server-managed. Never accept client forgeries of
 * fromEmail / configurationSetName / verified status / another event's host.
 * Change these only via provision-mail / custom-domain routes.
 */
function lockServerManagedDomain(incoming: EventConfig, existing: EventConfig): EventConfig {
  return {
    ...incoming,
    domain: {
      ...incoming.domain,
      slug: existing.domain.slug,
      mail: existing.domain.mail,
      customHost: existing.domain.customHost,
      customHostStatus: existing.domain.customHostStatus,
      customHostToken: existing.domain.customHostToken,
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
    expectedUpdatedAt?: string
  } | null
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  try {
    const actor = await currentActor()
    if (body.config) {
      const existing = await getEvent(id)
      if (!existing) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
      body.config = lockServerManagedDomain(body.config, existing.config)
      if (!canManageEventOptions(actor)) {
        body.config = lockOwnerOnlyOptions(body.config, existing.config)
      }
    }
    // N3: never accept client slug renames here — breaks mailed invite links.
    const event = await updateEvent(id, {
      config: body.config,
      wizard: body.wizard,
      expectedUpdatedAt: body.expectedUpdatedAt,
    })
    if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    return NextResponse.json({ event })
  } catch (error) {
    if (error instanceof StaleWriteError) {
      return NextResponse.json(
        {
          error: 'Conflito: o evento foi alterado noutro separador. Recarregue e tente de novo.',
          code: 'stale_write',
          event: error.current,
        },
        { status: 409 },
      )
    }
    return platformApiError(error, 'Não foi possível atualizar o evento')
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const actor = await currentActor()
  if (!canManageEventOptions(actor)) {
    return NextResponse.json(
      { error: 'Só o owner ou admin pode apagar o evento permanentemente. Use Arquivar.' },
      { status: 403 },
    )
  }
  const body = (await request.json().catch(() => null)) as { confirmSlug?: string } | null
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  const confirmSlug = String(body?.confirmSlug || '').trim()
  if (!confirmSlug || confirmSlug !== event.slug) {
    return NextResponse.json(
      {
        error: `Confirme digitando o slug do evento (${event.slug}) para apagar permanentemente.`,
      },
      { status: 400 },
    )
  }
  try {
    const ok = await deleteEvent(id)
    if (!ok) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return platformApiError(error, 'Não foi possível apagar o evento')
  }
}
