import { NextResponse } from 'next/server'
import {
  addGuest,
  deleteGuestPerson,
  getEvent,
  replaceGuests,
  updateGuest,
} from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import { consumeRateLimit } from '@/lib/platform/rate-limit'
import { uid } from '@/lib/platform/ids'
import { parseEmailsInput } from '@/lib/platform/family-emails'
import { normalizePerson } from '@/lib/platform/normalize-guest'
import { isRsvpDeadlinePassed } from '@/lib/platform/rsvp-deadline'
import type { Guest, GuestPerson, GuestRsvp, ScheduleInviteMode } from '@/lib/platform/types'
import { SCHEDULE_INVITE_MODES } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ guests: event.guests })
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as {
    familyName?: string
    email?: string
    emails?: string[]
    partySize?: number
    status?: GuestRsvp
    meal?: string
    dietary?: string
    message?: string
    fromPublic?: boolean
    people?: GuestPerson[]
  } | null

  if (body?.fromPublic) {
    if (event.status !== 'published') {
      return NextResponse.json({ error: 'Evento ainda não publicado' }, { status: 403 })
    }
    if (!event.config.rsvp.publicFormEnabled) {
      return NextResponse.json({ error: 'Formulário público de RSVP desativado' }, { status: 403 })
    }
    if (isRsvpDeadlinePassed(event.config.rsvp.deadline)) {
      return NextResponse.json({ error: 'O prazo do RSVP já passou.' }, { status: 403 })
    }
    const ip = clientIp(request)
    const limit = await consumeRateLimit(`rsvp:public:${id}:${ip}`, 30, 3_600_000)
    if (!limit.ok) {
      return NextResponse.json({ error: 'Demasiados pedidos. Tente mais tarde.' }, { status: 429 })
    }
  } else {
    const denied = await requireEventAccess(id)
    if (denied) return denied
  }

  const familyName = body?.familyName?.trim()
  if (!familyName) {
    return NextResponse.json({ error: 'Informe o nome da família' }, { status: 400 })
  }

  const status: GuestRsvp =
    body?.status === 'no' ? 'no' : body?.status === 'pending' ? 'pending' : 'yes'
  const partySize = Math.max(1, Number(body?.partySize) || 1)
  const meal = body?.meal?.trim() || ''
  const dietary = body?.dietary?.trim() || ''

  const people: GuestPerson[] =
    Array.isArray(body?.people) && body.people.length
      ? body.people.map((person) =>
          normalizePerson({
            ...person,
            status: person.status || status,
            meal: person.meal || meal,
            dietary: person.dietary || dietary,
          }),
        )
      : Array.from({ length: partySize }, (_, i) =>
          normalizePerson({
            name: i === 0 ? familyName : `${familyName} ${i + 1}`,
            type: 'adult',
            status,
            meal,
            dietary,
          }),
        )

  const emails = Array.from(
    new Set([
      ...parseEmailsInput(body?.email || ''),
      ...(Array.isArray(body?.emails) ? body.emails.flatMap((item) => parseEmailsInput(item)) : []),
    ]),
  )
  const email = emails[0] || ''
  const existing =
    emails.length > 0 &&
    event.guests.find((item) => {
      return emails.some((needle) => {
        if (item.email.trim().toLowerCase() === needle) return true
        return (item.emails || []).some((value) => value.trim().toLowerCase() === needle)
      })
    })

  const guest = await addGuest(id, {
    familyName,
    email,
    emails,
    partySize: people.length,
    status,
    meal,
    dietary,
    message: body?.message?.trim() || '',
    people,
    openRsvp: event.config.rsvp.openRsvpDefault,
  })
  if (!guest) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ guest, merged: Boolean(existing) })
}

export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const body = (await request.json().catch(() => null)) as {
    guests?: Guest[]
    allowEmpty?: boolean
    allowDrop?: boolean
  } | null
  if (!body?.guests) return NextResponse.json({ error: 'Lista inválida' }, { status: 400 })
  const event = await replaceGuests(id, body.guests, {
    allowEmpty: body.allowEmpty === true,
    allowDrop: body.allowDrop === true,
  })
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  if ('error' in event && event.error === 'empty_wipe') {
    return NextResponse.json(
      {
        error:
          'Recusado: a lista local está vazia mas o evento já tem convidados. Recarregue a página e tente de novo.',
      },
      { status: 409 },
    )
  }
  if ('error' in event && event.error === 'stale_drop') {
    return NextResponse.json(
      {
        error: `Recusado: a lista local omitiria ${event.dropped} convidado(s) já guardados. Recarregue a página.`,
        dropped: event.dropped,
      },
      { status: 409 },
    )
  }
  return NextResponse.json({ event })
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as {
    guestId?: string
    scheduleInviteMode?: ScheduleInviteMode
    scheduleItemIds?: string[]
  } | null

  const guestId = body?.guestId?.trim()
  if (!guestId) {
    return NextResponse.json({ error: 'Informe guestId' }, { status: 400 })
  }

  const patch: Partial<Guest> = {}
  if (body?.scheduleInviteMode !== undefined) {
    if (!(SCHEDULE_INVITE_MODES as readonly string[]).includes(body.scheduleInviteMode)) {
      return NextResponse.json({ error: 'scheduleInviteMode inválido' }, { status: 400 })
    }
    patch.scheduleInviteMode = body.scheduleInviteMode
  }
  if (body?.scheduleItemIds !== undefined) {
    if (!Array.isArray(body.scheduleItemIds)) {
      return NextResponse.json({ error: 'scheduleItemIds inválido' }, { status: 400 })
    }
    patch.scheduleItemIds = body.scheduleItemIds.map(String)
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  const updated = await updateGuest(id, guestId, patch)
  if (!updated) return NextResponse.json({ error: 'Convidado não encontrado' }, { status: 404 })
  return NextResponse.json({ guest: updated.guest, event: updated.event })
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as {
    guestId?: string
    personId?: string
  } | null
  const guestId = body?.guestId?.trim()
  if (!guestId) {
    return NextResponse.json({ error: 'Informe guestId' }, { status: 400 })
  }

  const result = await deleteGuestPerson(id, guestId, body?.personId?.trim() || null)
  if (!result) return NextResponse.json({ error: 'Convidado não encontrado' }, { status: 404 })
  return NextResponse.json({
    ok: true,
    deleted: result.deleted,
    guest: result.guest || null,
    event: result.event,
  })
}
