import { NextResponse } from 'next/server'
import { exportGuestCsv } from '@/lib/platform/csv'
import { getEvent } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  const csv = exportGuestCsv(event.guests)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}-convidados.csv"`,
    },
  })
}
