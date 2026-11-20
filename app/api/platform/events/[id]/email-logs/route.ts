import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import { getEvent, listEmailLogs } from '@/lib/platform/store'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const limitRaw = Number(new URL(request.url).searchParams.get('limit') || '100')
  const limit = Math.min(300, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 100))
  const logs = (await listEmailLogs(id))
    .slice()
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .slice(0, limit)

  return NextResponse.json({ logs, total: logs.length })
}
