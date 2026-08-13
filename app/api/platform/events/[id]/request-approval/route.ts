import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
import { getEvent, requestApproval } from '@/lib/platform/store'
import { reviewIssues } from '@/lib/platform/wizard'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
  const current = await getEvent(id)
  if (!current) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  const issues = reviewIssues(current.config)
  if (issues.length) {
    return NextResponse.json({ error: 'Complete os campos obrigatórios antes de pedir aprovação', issues }, { status: 400 })
  }
  const event = await requestApproval(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({
    event,
    approvalUrl: `/approve/${event.approvalToken}`,
  })
}
