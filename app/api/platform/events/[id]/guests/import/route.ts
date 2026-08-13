import { NextResponse } from 'next/server'
import { parseGuestCsv } from '@/lib/platform/csv'
import { addGuests, getEvent } from '@/lib/platform/store'
import { requireSession } from '@/lib/platform/session'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const contentType = request.headers.get('content-type') || ''
  let csv = ''
  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    csv = await request.text()
  } else {
    const body = (await request.json().catch(() => null)) as { csv?: string } | null
    csv = body?.csv || ''
  }
  const rows = parseGuestCsv(csv)
  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV vazio ou sem coluna de nome' }, { status: 400 })
  }
  const added = await addGuests(id, rows)
  if (!added) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ added: added.length, guests: added })
}
