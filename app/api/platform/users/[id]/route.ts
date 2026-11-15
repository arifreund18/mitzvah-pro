import { NextResponse } from 'next/server'
import { normalizeEventIds } from '@/lib/platform/access'
import { currentActor, requireUserManagement } from '@/lib/platform/session'
import { deleteUser, getUser, updateUser } from '@/lib/platform/store'
import type { UserRole } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await requireUserManagement()
  if (denied) return denied
  const actor = await currentActor()
  const { id } = await ctx.params
  const target = await getUser(id)
  if (!target) return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 })
  if (actor?.role !== 'platform_admin' && target.orgId !== actor?.orgId) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = (await request.json().catch(() => null)) as {
    name?: string
    role?: UserRole
    eventIds?: string[]
  } | null
  const role =
    body?.role === 'org_member' || body?.role === 'org_owner' ? body.role : undefined
  const eventIds = body?.eventIds !== undefined ? normalizeEventIds(body.eventIds) : undefined
  if ((role || target.role) === 'org_member' && eventIds !== undefined && eventIds.length === 0) {
    return NextResponse.json({ error: 'Escolha pelo menos um evento para o membro' }, { status: 400 })
  }
  try {
    const user = await updateUser(id, {
      name: body?.name,
      role,
      eventIds,
    })
    if (!user) return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 })
    const { passwordHash: _, ...safe } = user
    return NextResponse.json({ user: safe })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível atualizar' },
      { status: 400 },
    )
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await requireUserManagement()
  if (denied) return denied
  const actor = await currentActor()
  const { id } = await ctx.params
  const target = await getUser(id)
  if (!target) return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 })
  if (actor?.role !== 'platform_admin' && target.orgId !== actor?.orgId) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (actor?.kind === 'user' && actor.userId === id) {
    return NextResponse.json({ error: 'Não pode remover a própria conta' }, { status: 400 })
  }
  const ok = await deleteUser(id)
  if (!ok) return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
