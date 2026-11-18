import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import { getEvent, replaceScheduleItemInvitations } from '@/lib/platform/store'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as {
    scheduleItemId?: string
    invitedGuestIds?: string[]
  } | null

  const scheduleItemId = body?.scheduleItemId?.trim()
  if (!scheduleItemId) {
    return NextResponse.json({ error: 'Informe scheduleItemId' }, { status: 400 })
  }
  if (!Array.isArray(body?.invitedGuestIds)) {
    return NextResponse.json({ error: 'invitedGuestIds inválido' }, { status: 400 })
  }

  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  if (!event.config.schedule.items.some((item) => item.id === scheduleItemId)) {
    return NextResponse.json({ error: 'Momento da programação não encontrado' }, { status: 404 })
  }

  const invitedGuestIds = [
    ...new Set(body.invitedGuestIds.filter((guestId) => typeof guestId === 'string' && guestId)),
  ]

  const updated = await replaceScheduleItemInvitations(id, scheduleItemId, invitedGuestIds)
  if (!updated) {
    return NextResponse.json({ error: 'Não foi possível atualizar convites' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    invitedCount: updated.invitedCount,
    event: updated.event,
  })
}
