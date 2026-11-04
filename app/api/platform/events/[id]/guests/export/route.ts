import { NextResponse } from 'next/server'
import { exportGuestCsv } from '@/lib/platform/csv'
import { exportGuestXlsx } from '@/lib/platform/xlsx-guests'
import { getEvent } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const format = (new URL(request.url).searchParams.get('format') || 'csv').toLowerCase()
  if (format === 'xlsx' || format === 'xls') {
    const buffer = exportGuestXlsx(event.guests)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${event.slug}-convidados.xlsx"`,
      },
    })
  }

  const csv = exportGuestCsv(event.guests)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}-convidados.csv"`,
    },
  })
}
