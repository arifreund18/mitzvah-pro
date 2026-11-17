import { NextResponse } from 'next/server'
import { getEvent, markMailSent, appendEmailLog } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import { isEmailConfigured, sendEmail } from '@/lib/email/send'
import { guestMailRecipients } from '@/lib/platform/family-emails'
import { eventHostReplyTo } from '@/lib/platform/mail-domain'
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

  const body = (await request.json().catch(() => null)) as {
    jobId?: string
    /** When true, move deferred guests back to pending (e.g. after leaving sandbox). */
    retryDeferred?: boolean
  } | null
  const job = body?.jobId
    ? await getMailJob(body.jobId)
    : await getLatestMailJobForEvent(id)

  if (!job || job.eventId !== id) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
  }
  if (job.status === 'completed' && !(body?.retryDeferred && (job.deferredGuestIds?.length || 0) > 0)) {
    return NextResponse.json({ ...mailJobProgress(job), done: true })
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: 'Provedor de email ausente' }, { status: 502 })
  }
  if (!job.from) {
    return NextResponse.json({ error: 'Remetente ausente no job' }, { status: 502 })
  }

  if (!job.deferredGuestIds) job.deferredGuestIds = []
  if (body?.retryDeferred && job.deferredGuestIds.length) {
    job.pendingGuestIds = [...job.deferredGuestIds, ...job.pendingGuestIds]
    job.deferredGuestIds = []
    job.deferred = 0
    job.status = 'pending'
  }

  job.status = 'processing'
  job.attempts += 1
  await saveMailJob(job)

  const batch = job.pendingGuestIds.slice(0, MAIL_BATCH_SIZE)
  let remaining = job.pendingGuestIds.slice(MAIL_BATCH_SIZE)
  const deliveredIds: string[] = []
  const guestById = new Map(event.guests.map((guest) => [guest.id, guest]))
  const replyTo = eventHostReplyTo(event.config)
  let stopEarly = false

  for (const guestId of batch) {
    if (stopEarly) {
      remaining = [guestId, ...remaining]
      continue
    }
    const guest = guestById.get(guestId)
    const recipients = guest ? guestMailRecipients(guest) : []
    if (!guest || recipients.length === 0) {
      job.processed += 1
      job.failed += 1
      job.errors.push(`${guestId}: convidado sem email`)
      continue
    }
    const toEmail = recipients.join(', ')
    const result = await sendEmail({
      from: job.from,
      to: recipients,
      replyTo,
      subject: mailSubject(job.kind, event.config, guest),
      html: mailHtml(job.kind, event.config, job.host, guest),
    })

    if (result.ok) {
      job.processed += 1
      deliveredIds.push(guest.id)
      job.succeeded += 1
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: job.kind,
        status: 'sent',
        toEmail,
        messageId: result.messageId,
      })
      continue
    }

    const err = result.error || 'send_failed'
    job.lastError = err

    if (result.retryable) {
      // Keep message: defer for later (throttle / daily cap / unverified recipient).
      job.deferredGuestIds.push(guestId)
      job.deferred = (job.deferred || 0) + 1
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: job.kind,
        status: 'deferred',
        toEmail,
        error: `${result.errorKind || 'retryable'}: ${err}`,
      })
      job.errors.push(`${toEmail}: deferred (${result.errorKind})`)
      if (result.errorKind === 'throttled' || result.errorKind === 'daily_limit') {
        stopEarly = true
      }
      continue
    }

    job.processed += 1
    job.failed += 1
    job.errors.push(`${toEmail}: ${err}`)
    await appendEmailLog({
      eventId: id,
      familyId: guest.id,
      type: job.kind,
      status: 'failed',
      toEmail,
      error: err,
    })
  }

  if (deliveredIds.length) {
    await markMailSent(id, job.kind, deliveredIds)
  }

  job.pendingGuestIds = remaining
  if (remaining.length === 0) {
    if ((job.deferredGuestIds?.length || 0) > 0) {
      // Done with ready work; deferred kept for retryDeferred / later process.
      job.status = 'completed'
    } else {
      job.status = job.succeeded === 0 && job.failed > 0 ? 'failed' : 'completed'
    }
  } else {
    job.status = 'pending'
  }
  await saveMailJob(job)

  if (remaining.length > 0 && !stopEarly) {
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
    stopEarly,
    done: remaining.length === 0,
  })
}
