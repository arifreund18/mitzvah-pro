import { NextResponse } from 'next/server'
import { getEvent, markMailSent, updateEvent, appendEmailLog } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import { getResend } from '@/lib/email/send'
import { provisionEventMailDomain, refreshEventMailDomain } from '@/lib/email/provision-domain'
import { eventSendFrom } from '@/lib/platform/mail-domain'
import { mailHtml, mailSubject } from '@/lib/platform/mail'
import { createMailJob, MAIL_BATCH_SIZE } from '@/lib/platform/mail-queue'
import type { EventConfig, Guest } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

export const maxDuration = 30

async function sendOne(opts: {
  resend: NonNullable<ReturnType<typeof getResend>>
  from: string
  kind: 'std' | 'invite'
  config: EventConfig
  host: string
  guest: Guest
}): Promise<{ ok: boolean; resendId: string | null; error: string }> {
  const result = await opts.resend.emails.send({
    from: opts.from,
    to: opts.guest.email,
    subject: mailSubject(opts.kind, opts.config, opts.guest),
    html: mailHtml(opts.kind, opts.config, opts.host, opts.guest),
  })
  if (result.error) {
    return { ok: false, resendId: null, error: result.error.message }
  }
  const data = result.data as { id?: string } | null
  return { ok: true, resendId: data?.id || null, error: '' }
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

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    new URL(request.url).host
  const targets = event.guests.filter((guest) => {
    if (!guest.email) return false
    if (body?.guestIds?.length) return body.guestIds.includes(guest.id)
    return true
  })
  if (targets.length === 0) {
    return NextResponse.json({ error: 'Nenhum convidado com email na seleção' }, { status: 400 })
  }

  const resend = getResend()
  let config = event.config

  if (config.domain.mail?.status === 'failed' || config.domain.mail?.status === 'skipped') {
    const mail = await provisionEventMailDomain(config)
    const updated = await updateEvent(id, {
      config: { ...config, domain: { ...config.domain, mail } },
    })
    if (updated) config = updated.config
  } else if (config.domain.mail?.status === 'pending' && config.domain.mail.resendDomainId) {
    const mail = await refreshEventMailDomain(config.domain.mail)
    if (mail.status !== config.domain.mail.status || mail.lastError !== config.domain.mail.lastError) {
      const updated = await updateEvent(id, {
        config: { ...config, domain: { ...config.domain, mail } },
      })
      if (updated) config = updated.config
    }
  }

  const from = eventSendFrom(config)
  if (!resend) {
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
        toEmail: guest.email,
        error: 'RESEND_API_KEY ausente',
      })
    }
    return NextResponse.json({
      event: marked?.event,
      sent: marked?.sent || 0,
      delivered: 0,
      local: true,
      warning: 'RESEND_API_KEY ausente — marcado localmente, sem envio real.',
    })
  }

  if (!from) {
    return NextResponse.json(
      {
        error:
          config.domain.mail?.lastError ||
          'Sem remetente: verifique o domínio isolado ou defina RESEND_FROM_EMAIL com domínio verificado no Resend.',
        mail: config.domain.mail,
      },
      { status: 502 },
    )
  }

  // Large sends: enqueue and kick background processor
  if (targets.length > MAIL_BATCH_SIZE) {
    const job = await createMailJob({
      eventId: id,
      kind,
      guestIds: targets.map((guest) => guest.id),
      host,
      from,
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
  const errors: string[] = []
  for (const guest of targets) {
    const result = await sendOne({ resend, from, kind, config, host, guest })
    if (result.ok) {
      deliveredIds.push(guest.id)
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: kind,
        status: 'sent',
        toEmail: guest.email,
        resendId: result.resendId,
      })
    } else {
      errors.push(`${guest.email}: ${result.error}`)
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: kind,
        status: 'failed',
        toEmail: guest.email,
        error: result.error,
      })
    }
  }

  if (deliveredIds.length === 0) {
    return NextResponse.json(
      {
        error: errors[0] || 'Resend recusou o envio',
        errors,
        delivered: 0,
        from,
        mail: config.domain.mail,
      },
      { status: 502 },
    )
  }

  const marked = await markMailSent(id, kind, deliveredIds)
  return NextResponse.json({
    event: marked?.event,
    sent: marked?.sent || 0,
    delivered: deliveredIds.length,
    failed: errors.length,
    errors: errors.length ? errors : undefined,
    from,
    local: false,
    mail: config.domain.mail,
  })
}
