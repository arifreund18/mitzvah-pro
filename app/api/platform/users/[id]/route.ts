import { NextResponse } from 'next/server'
import { currentActor, requireUserManagement } from '@/lib/platform/session'
import { deleteUser, getUser } from '@/lib/platform/store'

type Ctx = { params: Promise<{ id: string }> }

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
