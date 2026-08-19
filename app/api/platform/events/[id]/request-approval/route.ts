import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import { getEvent, requestApproval } from '@/lib/platform/store'
import { reviewIssues } from '@/lib/platform/wizard'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
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
