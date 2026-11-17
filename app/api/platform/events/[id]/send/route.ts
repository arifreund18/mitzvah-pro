import { NextResponse } from 'next/server'
import { getEvent, markMailSent, updateEvent, appendEmailLog } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import { isEmailConfigured, sendEmail } from '@/lib/email/send'
import { provisionEventMailDomain, refreshEventMailDomain } from '@/lib/email/provision-domain'
import { guestMailRecipients } from '@/lib/platform/family-emails'
import {
  eventHostReplyTo,
  eventMailConfigurationSet,
  eventSendFrom,
} from '@/lib/platform/mail-domain'
import { mailHtml, mailSubject } from '@/lib/platform/mail'
import { createMailJob, MAIL_BATCH_SIZE } from '@/lib/platform/mail-queue'
import type { EventConfig, Guest } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

export const maxDuration = 30

async function sendOne(opts: {
  from: string
  replyTo?: string
  configurationSetName?: string
  kind: 'std' | 'invite'
  config: EventConfig
  host: string
  guest: Guest
}): Promise<{
  ok: boolean
  messageId: string | null
  error: string
  retryable: boolean
  errorKind: string | null
  recipients: string[]
}> {
  const recipients = guestMailRecipients(opts.guest)
  if (recipients.length === 0) {
    return {
      ok: false,
      messageId: null,
      error: 'sem email',
      retryable: false,
      errorKind: null,
      recipients: [],
    }
  }
  const result = await sendEmail({
    from: opts.from,
    to: recipients,
    replyTo: opts.replyTo,
    configurationSetName: opts.configurationSetName,
    subject: mailSubject(opts.kind, opts.config, opts.guest),
    html: mailHtml(opts.kind, opts.config, opts.host, opts.guest),
  })
  if (!result.ok) {
    return {
      ok: false,
      messageId: null,
      error: result.error || 'send_failed',
      retryable: result.retryable,
      errorKind: result.errorKind,
      recipients,
    }
  }
  return {
    ok: true,
    messageId: result.messageId,
    error: '',
    retryable: false,
    errorKind: null,
    recipients,
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as {
    kind?: 'std' | 'invite'
    guestIds?: string[]
  } | null
  const kind = body?.kind
  if (kind !== 'std' && kind !== 'invite') {
    return NextResponse.json({ error: 'Informe std ou invite' }, { status: 400 })
  }
  if (kind === 'std' && !event.config.saveTheDate.enabled) {
    return NextResponse.json({ error: 'Save the Date está desativado neste evento' }, { status: 400 })
  }
  if (kind === 'invite' && event.config.products && event.config.products.invitation === false) {
    return NextResponse.json({ error: 'Convite está desativado neste evento' }, { status: 400 })
  }

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    new URL(request.url).host
  const targets = event.guests.filter((guest) => {
    if (guestMailRecipients(guest).length === 0) return false
    if (body?.guestIds?.length) return body.guestIds.includes(guest.id)
    return true
  })
  if (targets.length === 0) {
    return NextResponse.json({ error: 'Nenhum convidado com email na seleção' }, { status: 400 })
  }

  const emailReady = isEmailConfigured()
  let config = event.config

  if (config.domain.mail?.status === 'failed' || config.domain.mail?.status === 'skipped') {
    const mail = await provisionEventMailDomain(config)
    const updated = await updateEvent(id, {
      config: { ...config, domain: { ...config.domain, mail } },
    })
    if (updated) config = updated.config
  } else if (config.domain.mail?.status === 'pending') {
    const mail = await refreshEventMailDomain(config.domain.mail)
    if (mail.status !== config.domain.mail.status || mail.lastError !== config.domain.mail.lastError) {
      const updated = await updateEvent(id, {
        config: { ...config, domain: { ...config.domain, mail } },
      })
      if (updated) config = updated.config
    }
  }

  const from = eventSendFrom(config)
  const replyTo = eventHostReplyTo(config)
  const configurationSetName = eventMailConfigurationSet(config)
  if (!emailReady) {
    const marked = await markMailSent(
      id,
      kind,
      targets.map((guest) => guest.id),
    )
    for (const guest of targets) {
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: kind,
        status: 'local',
        toEmail: guestMailRecipients(guest).join(', ') || guest.email,
        error: 'Provedor de email ausente (EMAIL_PROVIDER / SES / Resend)',
      })
    }
    return NextResponse.json({
      event: marked?.event,
      sent: marked?.sent || 0,
      delivered: 0,
      local: true,
      warning: 'Provedor de email ausente — marcado localmente, sem envio real.',
    })
  }

  if (!from) {
    return NextResponse.json(
      {
        error:
          config.domain.mail?.lastError ||
          'Sem remetente: defina EMAIL_FROM_ADDRESS (ex. convites@mitzvah.pro) ou RESEND_FROM_EMAIL.',
        mail: config.domain.mail,
      },
      { status: 502 },
    )
  }

  // Large sends: enqueue and kick background processor (rate-limited in process).
  if (targets.length > MAIL_BATCH_SIZE) {
    const job = await createMailJob({
      eventId: id,
      kind,
      guestIds: targets.map((guest) => guest.id),
      host,
      from,
      configurationSetName,
    })
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

    return NextResponse.json({
      queued: true,
      jobId: job.id,
      total: targets.length,
      from,
      mail: config.domain.mail,
    })
  }

  const deliveredIds: string[] = []
  const deferredIds: string[] = []
  const errors: string[] = []
  for (const guest of targets) {
    const result = await sendOne({ from, replyTo, configurationSetName, kind, config, host, guest })
    const toEmail = result.recipients.join(', ') || guest.email
    if (result.ok) {
      deliveredIds.push(guest.id)
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: kind,
        status: 'sent',
        toEmail,
        messageId: result.messageId,
      })
    } else if (result.retryable) {
      deferredIds.push(guest.id)
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: kind,
        status: 'deferred',
        toEmail,
        error: `${result.errorKind || 'retryable'}: ${result.error}`,
      })
      errors.push(`${toEmail || guest.id}: deferred (${result.errorKind})`)
    } else {
      errors.push(`${toEmail || guest.id}: ${result.error}`)
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: kind,
        status: 'failed',
        toEmail,
        error: result.error,
      })
    }
  }

  if (deliveredIds.length === 0 && deferredIds.length === 0) {
    return NextResponse.json(
      {
        error: errors[0] || 'Provedor de email recusou o envio',
        errors,
        delivered: 0,
        from,
        mail: config.domain.mail,
      },
      { status: 502 },
    )
  }

  // Persist deferred guests in a job so they are not lost.
  if (deferredIds.length) {
    await createMailJob({
      eventId: id,
      kind,
      guestIds: deferredIds,
      host,
      from,
      configurationSetName,
    })
  }

  const marked = deliveredIds.length ? await markMailSent(id, kind, deliveredIds) : null
  return NextResponse.json({
    event: marked?.event || event,
    sent: marked?.sent || 0,
    delivered: deliveredIds.length,
    deferred: deferredIds.length,
    failed: errors.length - deferredIds.length,
    errors: errors.length ? errors : undefined,
    from,
    local: false,
    mail: config.domain.mail,
  })
}
