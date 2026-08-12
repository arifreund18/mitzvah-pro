import { NextResponse } from 'next/server'
import { addGuest, getEvent, replaceGuests } from '@/lib/platform/store'
import { requireSession } from '@/lib/platform/session'
import type { Guest, GuestRsvp } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
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
  } | null

  if (body?.fromPublic && event.status !== 'published') {
    return NextResponse.json({ error: 'Evento ainda não publicado' }, { status: 403 })
  }
  if (!body?.fromPublic) {
    const denied = await requireSession()
    if (denied) return denied
  }

  const familyName = body?.familyName?.trim()
  if (!familyName) {
    return NextResponse.json({ error: 'Informe o nome da família' }, { status: 400 })
  }

  const guest = await addGuest(id, {
    familyName,
    email: body?.email?.trim() || '',
    partySize: Math.max(1, Number(body?.partySize) || 1),
    status: body?.status === 'no' ? 'no' : body?.status === 'pending' ? 'pending' : 'yes',
    meal: body?.meal?.trim() || '',
    dietary: body?.dietary?.trim() || '',
    message: body?.message?.trim() || '',
  })
  return NextResponse.json({ guest })
}

export async function PUT(request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as { guests?: Guest[] } | null
  if (!body?.guests) return NextResponse.json({ error: 'Lista inválida' }, { status: 400 })
  const event = await replaceGuests(id, body.guests)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ event })
}
