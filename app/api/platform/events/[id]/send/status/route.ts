import { NextResponse } from 'next/server'
import { requireEventAccess } from '@/lib/platform/session'
import {
  getLatestMailJobForEvent,
  getMailJob,
  mailJobProgress,
} from '@/lib/platform/mail-queue'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied

  const jobId = new URL(request.url).searchParams.get('jobId') || ''
  const job = jobId ? await getMailJob(jobId) : await getLatestMailJobForEvent(id)
  if (!job || job.eventId !== id) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    ...mailJobProgress(job),
    done: job.status === 'completed' || job.status === 'failed',
  })
}
