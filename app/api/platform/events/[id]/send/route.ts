import { NextResponse } from 'next/server'
import { getEvent, markMailSent, updateEvent, appendEmailLog } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import { isEmailConfigured } from '@/lib/email/send'
import { provisionEventMailDomain, refreshEventMailDomain } from '@/lib/email/provision-domain'
import { guestMailRecipients } from '@/lib/platform/family-emails'
import { eventMailConfigurationSet, eventSendFrom } from '@/lib/platform/mail-domain'
import { createMailJobExclusive } from '@/lib/platform/mail-queue'
import { mailTargetsEmptyReason, selectMailTargets } from '@/lib/platform/mail-targets'

type Ctx = { params: Promise<{ id: string }> }

export const maxDuration = 30

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
  // Bulk (no guestIds): only guests who have not received this kind yet.
  // With guestIds: allow individual re-send to those specific guests.
  const targets = selectMailTargets(event.guests, kind, body?.guestIds)
  if (targets.length === 0) {
    return NextResponse.json(
      { error: mailTargetsEmptyReason(event.guests, kind, body?.guestIds) },
      { status: 400 },
    )
  }

  const emailReady = isEmailConfigured()
  let config = event.config

  const mailNeedsProvision =
    !config.domain.mail ||
    config.domain.mail.status === 'failed' ||
    config.domain.mail.status === 'skipped' ||
    !config.domain.mail.configurationSetName
  if (mailNeedsProvision) {
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

  // Always enqueue (even 1 guest): claimed batches + exclusive job prevent
  // double-click / two-tab duplicate SES sends (Adissi-class flood).
  const exclusive = await createMailJobExclusive({
    eventId: id,
    kind,
    guestIds: targets.map((guest) => guest.id),
    host,
    from,
    configurationSetName,
  })
  if (!exclusive.created) {
    return NextResponse.json(
      {
        error: 'Já existe um envio em curso para este evento. Aguarde terminar ou cancele a fila.',
        queued: true,
        jobId: exclusive.job.id,
        total: exclusive.job.guestIds.length,
        from,
        mail: config.domain.mail,
      },
      { status: 409 },
    )
  }

  const job = exclusive.job
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
