import { NextResponse } from 'next/server'
import { getEvent, markMailSent, appendEmailLog } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import { getResend } from '@/lib/email/send'
import { mailHtml, mailSubject } from '@/lib/platform/mail'
import {
  getLatestMailJobForEvent,
  getMailJob,
  MAIL_BATCH_SIZE,
  mailJobProgress,
  saveMailJob,
} from '@/lib/platform/mail-queue'

type Ctx = { params: Promise<{ id: string }> }

export const maxDuration = 60

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied

  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as { jobId?: string } | null
  const job = body?.jobId
    ? await getMailJob(body.jobId)
    : await getLatestMailJobForEvent(id)

  if (!job || job.eventId !== id) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
  }
  if (job.status === 'completed') {
    return NextResponse.json({ ...mailJobProgress(job), done: true })
  }

  const resend = getResend()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY ausente' }, { status: 502 })
  }
  if (!job.from) {
    return NextResponse.json({ error: 'Remetente ausente no job' }, { status: 502 })
  }

  job.status = 'processing'
  job.attempts += 1
  await saveMailJob(job)

  const batch = job.pendingGuestIds.slice(0, MAIL_BATCH_SIZE)
  const remaining = job.pendingGuestIds.slice(MAIL_BATCH_SIZE)
  const deliveredIds: string[] = []
  const guestById = new Map(event.guests.map((guest) => [guest.id, guest]))

  for (const guestId of batch) {
    const guest = guestById.get(guestId)
    if (!guest?.email) {
      job.processed += 1
      job.failed += 1
      job.errors.push(`${guestId}: convidado sem email`)
      continue
    }
    const result = await resend.emails.send({
      from: job.from,
      to: guest.email,
      subject: mailSubject(job.kind, event.config, guest),
      html: mailHtml(job.kind, event.config, job.host, guest),
    })
    job.processed += 1
    if (!result.error) {
      deliveredIds.push(guest.id)
      job.succeeded += 1
      const data = result.data as { id?: string } | null
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: job.kind,
        status: 'sent',
        toEmail: guest.email,
        resendId: data?.id || null,
      })
    } else {
      job.failed += 1
      job.errors.push(`${guest.email}: ${result.error.message}`)
      job.lastError = result.error.message
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: job.kind,
        status: 'failed',
        toEmail: guest.email,
        error: result.error.message,
      })
    }
  }

  if (deliveredIds.length) {
    await markMailSent(id, job.kind, deliveredIds)
  }

  job.pendingGuestIds = remaining
  if (remaining.length === 0) {
    job.status = job.succeeded === 0 && job.failed > 0 ? 'failed' : 'completed'
  } else {
    job.status = 'pending'
  }
  await saveMailJob(job)

  if (remaining.length > 0) {
    const processUrl = new URL(`/api/platform/events/${id}/send/process`, request.url)
    const cookie = request.headers.get('cookie') || ''
    void fetch(processUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(() => undefined)
  }

  return NextResponse.json({
    ...mailJobProgress(job),
    batchSize: batch.length,
    done: remaining.length === 0,
  })
}
