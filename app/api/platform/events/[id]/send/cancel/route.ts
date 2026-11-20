import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import {
  cancelMailJob,
  getLatestMailJobForEvent,
  getMailJob,
  mailJobProgress,
} from '@/lib/platform/mail-queue'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as { jobId?: string } | null
  const job = body?.jobId
    ? await getMailJob(body.jobId)
    : await getLatestMailJobForEvent(id)

  if (!job || job.eventId !== id) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
  }

  const cancelled = await cancelMailJob(job.id, 'cancelled by host')
  if (!cancelled) return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })

  return NextResponse.json({
    ...mailJobProgress(cancelled),
    cancelled: true,
    done: true,
  })
}
