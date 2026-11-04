import { NextResponse } from 'next/server'
import { addGuest, getEvent, replaceGuests } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import { consumeRateLimit } from '@/lib/platform/rate-limit'
import { uid } from '@/lib/platform/ids'
import type { Guest, GuestPerson, GuestRsvp } from '@/lib/platform/types'

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
      ? body.people
      : Array.from({ length: partySize }, (_, i) => ({
          id: uid(),
          name: i === 0 ? familyName : `${familyName} ${i + 1}`,
          type: 'adult' as const,
          status,
          meal,
          dietary,
        }))

  const guest = await addGuest(id, {
    familyName,
    email: body?.email?.trim() || '',
    partySize: people.length,
    status,
    meal,
    dietary,
    message: body?.message?.trim() || '',
    people,
    openRsvp: event.config.rsvp.openRsvpDefault,
  })
  return NextResponse.json({ guest })
}

export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const body = (await request.json().catch(() => null)) as { guests?: Guest[] } | null
  if (!body?.guests) return NextResponse.json({ error: 'Lista inválida' }, { status: 400 })
  const event = await replaceGuests(id, body.guests)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ event })
}
