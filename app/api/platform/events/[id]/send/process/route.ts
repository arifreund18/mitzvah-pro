import { NextResponse } from 'next/server'
import { getEvent, markMailSent, appendEmailLog } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import { isEmailConfigured, sendEmail } from '@/lib/email/send'
import { guestMailRecipients } from '@/lib/platform/family-emails'
import { eventHostReplyTo, eventMailConfigurationSet } from '@/lib/platform/mail-domain'
import { mailHtml, mailSubject } from '@/lib/platform/mail'
import {
  claimMailJobBatch,
  getLatestMailJobForEvent,
  getMailJob,
  MAIL_BATCH_SIZE,
  mailJobProgress,
  recordMailJobBatchResult,
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

  const jobRef = body?.jobId
    ? await getMailJob(body.jobId)
    : await getLatestMailJobForEvent(id)

  if (!jobRef || jobRef.eventId !== id) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
  }

  if (
    jobRef.status === 'completed' &&
    !(body?.retryDeferred && (jobRef.deferredGuestIds?.length || 0) > 0)
  ) {
    return NextResponse.json({ ...mailJobProgress(jobRef), done: true })
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: 'Provedor de email ausente' }, { status: 502 })
  }
  if (!jobRef.from) {
    return NextResponse.json({ error: 'Remetente ausente no job' }, { status: 502 })
  }

  if (body?.retryDeferred && (jobRef.deferredGuestIds?.length || 0) > 0) {
    const revived = await recordMailJobBatchResult(jobRef.id, { retryDeferred: true })
    if (!revived) return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
  }

  // Claim batch BEFORE sending so concurrent workers get disjoint IDs (no duplicate SES).
  const claimed = await claimMailJobBatch(jobRef.id, MAIL_BATCH_SIZE)
  if (!claimed) return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })

  const { batch } = claimed
  let job = claimed.job

  if (batch.length === 0) {
    // Empty claim: either finished, or another worker holds the in-flight lease.
    const done = job.status === 'completed' || job.status === 'failed'
    return NextResponse.json({
      ...mailJobProgress(job),
      batchSize: 0,
      stopEarly: false,
      done,
    })
  }

  const deliveredIds: string[] = []
  const deferredGuestIds: string[] = []
  const errors: string[] = []
  let succeeded = 0
  let failed = 0
  let lastError = ''
  let stopEarly = false

  const guestById = new Map(event.guests.map((guest) => [guest.id, guest]))
  const replyTo = eventHostReplyTo(event.config)
  const configurationSetName =
    job.configurationSetName || eventMailConfigurationSet(event.config)
  const unsentDueToStop: string[] = []

  for (const guestId of batch) {
    if (stopEarly) {
      unsentDueToStop.push(guestId)
      continue
    }

    const guest = guestById.get(guestId)
    if (!guest) {
      failed += 1
      errors.push(`${guestId}: convidado não encontrado`)
      continue
    }

    const alreadySent = job.kind === 'std' ? Boolean(guest.stdSentAt) : Boolean(guest.inviteSentAt)
    if (alreadySent) {
      // Idempotent: do not re-send if a parallel worker or prior attempt already marked it.
      succeeded += 1
      continue
    }

    const recipients = guestMailRecipients(guest)
    if (recipients.length === 0) {
      failed += 1
      errors.push(`${guestId}: convidado sem email`)
      continue
    }

    const toEmail = recipients.join(', ')
    const result = await sendEmail({
      from: job.from,
      to: recipients,
      replyTo,
      configurationSetName,
      subject: mailSubject(job.kind, event.config, guest),
      html: mailHtml(job.kind, event.config, job.host, guest),
    })

    if (result.ok) {
      deliveredIds.push(guest.id)
      succeeded += 1
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
    lastError = err

    if (result.retryable) {
      deferredGuestIds.push(guestId)
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: job.kind,
        status: 'deferred',
        toEmail,
        error: `${result.errorKind || 'retryable'}: ${err}`,
      })
      errors.push(`${toEmail}: deferred (${result.errorKind})`)
      if (result.errorKind === 'throttled' || result.errorKind === 'daily_limit') {
        stopEarly = true
      }
      continue
    }

    failed += 1
    errors.push(`${toEmail}: ${err}`)
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

  job =
    (await recordMailJobBatchResult(job.id, {
      succeeded,
      failed,
      deferredGuestIds,
      requeueGuestIds: unsentDueToStop,
      errors,
      lastError: lastError || undefined,
    })) || job

  if (job.pendingGuestIds.length > 0 && !stopEarly) {
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
    done: job.status === 'completed' || job.status === 'failed',
  })
}
