import { NextResponse } from 'next/server'
import { isEmailConfigured, sendEmail } from '@/lib/email/send'
import { provisionEventMailDomain, refreshEventMailDomain } from '@/lib/email/provision-domain'
import { guestMailRecipients } from '@/lib/platform/family-emails'
import {
  followUpTargetsEmptyReason,
  isHostFollowUpAudience,
  isHostFollowUpType,
  selectFollowUpTargets,
} from '@/lib/platform/follow-up'
import { mailFollowUpHtml, mailFollowUpSubject } from '@/lib/platform/mail'
import {
  eventHostReplyTo,
  eventMailConfigurationSet,
  eventSendFrom,
} from '@/lib/platform/mail-domain'
import { requireEventAccess } from '@/lib/platform/session'
import {
  appendEmailLog,
  createFollowUp,
  getEvent,
  updateEvent,
  updateFollowUpStats,
} from '@/lib/platform/store'
import type { EventConfig, Guest, HostFollowUp, HostFollowUpAudience, HostFollowUpType } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

export const maxDuration = 60

async function ensureMailReady(id: string, config: EventConfig): Promise<EventConfig> {
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
    return updated?.config || config
  }
  if (config.domain.mail?.status === 'pending') {
    const mail = await refreshEventMailDomain(config.domain.mail)
    if (mail.status !== config.domain.mail.status || mail.lastError !== config.domain.mail.lastError) {
      const updated = await updateEvent(id, {
        config: { ...config, domain: { ...config.domain, mail } },
      })
      if (updated) return updated.config
    }
  }
  return config
}

async function sendOne(opts: {
  from: string
  replyTo?: string
  configurationSetName?: string
  followUp: HostFollowUp
  config: EventConfig
  host: string
  guest: Guest
}): Promise<{
  ok: boolean
  messageId: string | null
  error: string
  retryable: boolean
  recipients: string[]
}> {
  const recipients = guestMailRecipients(opts.guest)
  if (recipients.length === 0) {
    return {
      ok: false,
      messageId: null,
      error: 'sem email',
      retryable: false,
      recipients: [],
    }
  }
  const result = await sendEmail({
    from: opts.from,
    to: recipients,
    replyTo: opts.replyTo,
    configurationSetName: opts.configurationSetName,
    subject: mailFollowUpSubject(opts.followUp, opts.config, opts.guest),
    html: mailFollowUpHtml(opts.followUp, opts.config, opts.host, opts.guest),
    text: opts.followUp.body,
  })
  if (!result.ok) {
    return {
      ok: false,
      messageId: null,
      error: result.error || 'send_failed',
      retryable: result.retryable,
      recipients,
    }
  }
  return {
    ok: true,
    messageId: result.messageId,
    error: '',
    retryable: false,
    recipients,
  }
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  const followUps = [...(event.config.followUps || [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  return NextResponse.json({ followUps })
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as {
    type?: string
    body?: string
    subject?: string
    audience?: string
    guestIds?: string[]
    dryRun?: boolean
    clientRequestId?: string
  } | null

  if (!isHostFollowUpType(body?.type)) {
    return NextResponse.json(
      { error: 'Informe type: reminder, message ou update' },
      { status: 400 },
    )
  }
  const messageBody = String(body?.body || '').trim()
  if (messageBody.length < 3) {
    return NextResponse.json({ error: 'Escreva o corpo da mensagem' }, { status: 400 })
  }
  if (messageBody.length > 5000) {
    return NextResponse.json({ error: 'Mensagem demasiado longa (máx. 5000)' }, { status: 400 })
  }
  const audience: HostFollowUpAudience = isHostFollowUpAudience(body?.audience)
    ? body.audience
    : 'all'
  const guestIds = Array.isArray(body?.guestIds)
    ? body.guestIds.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  const clientRequestId =
    String(body?.clientRequestId || request.headers.get('idempotency-key') || '').trim() ||
    undefined

  const draft: HostFollowUp = {
    id: 'draft',
    type: body.type as HostFollowUpType,
    body: messageBody,
    subject: String(body?.subject || '').trim(),
    audience,
    guestIds,
    clientRequestId,
    createdAt: new Date().toISOString(),
    sentAt: null,
    sentCount: 0,
    failedCount: 0,
    deferredCount: 0,
  }

  const targets = selectFollowUpTargets(event.guests, draft)
  if (targets.length === 0) {
    return NextResponse.json(
      { error: followUpTargetsEmptyReason(event.guests, draft) },
      { status: 400 },
    )
  }

  if (body?.dryRun) {
    return NextResponse.json({
      dryRun: true,
      recipients: targets.length,
      type: draft.type,
      audience: draft.audience,
    })
  }

  const created = await createFollowUp(id, {
    type: draft.type,
    body: draft.body,
    subject: draft.subject,
    audience: draft.audience,
    guestIds: draft.guestIds,
    clientRequestId,
  })
  if (!created) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  // Duplicate click / retry with the same Idempotency-Key — do not send again.
  if (created.replayed) {
    return NextResponse.json({
      followUp: created.followUp,
      sent: created.followUp.sentCount,
      delivered: created.followUp.sentCount,
      deferred: created.followUp.deferredCount,
      failed: created.followUp.failedCount,
      replayed: true,
      recipients: targets.length,
    })
  }

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    new URL(request.url).host

  let config = await ensureMailReady(id, created.event.config)
  const followUp = created.followUp
  const emailReady = isEmailConfigured()
  const from = eventSendFrom(config)
  const replyTo = eventHostReplyTo(config)
  const configurationSetName = eventMailConfigurationSet(config)

  if (!emailReady || !from) {
    for (const guest of targets) {
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: `followup-${followUp.type}`,
        status: 'local',
        toEmail: guestMailRecipients(guest).join(', ') || guest.email,
        error: 'Provedor de email ausente (EMAIL_PROVIDER / SES / Resend)',
      })
    }
    await updateFollowUpStats(id, followUp.id, {
      sentAt: new Date().toISOString(),
      sentCount: targets.length,
      failedCount: 0,
      deferredCount: 0,
    })
    return NextResponse.json({
      followUp: { ...followUp, sentAt: new Date().toISOString(), sentCount: targets.length },
      sent: targets.length,
      delivered: 0,
      local: true,
      warning: 'Provedor de email ausente — marcado localmente, sem envio real.',
    })
  }

  const deliveredIds: string[] = []
  const deferredIds: string[] = []
  const errors: string[] = []

  for (const guest of targets) {
    const result = await sendOne({
      from,
      replyTo,
      configurationSetName,
      followUp,
      config,
      host,
      guest,
    })
    const toEmail = result.recipients.join(', ') || guest.email
    if (result.ok) {
      deliveredIds.push(guest.id)
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: `followup-${followUp.type}`,
        status: 'sent',
        toEmail,
        messageId: result.messageId,
      })
    } else if (result.retryable) {
      deferredIds.push(guest.id)
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: `followup-${followUp.type}`,
        status: 'deferred',
        toEmail,
        error: result.error,
      })
      errors.push(`${toEmail || guest.id}: deferred`)
    } else {
      errors.push(`${toEmail || guest.id}: ${result.error}`)
      await appendEmailLog({
        eventId: id,
        familyId: guest.id,
        type: `followup-${followUp.type}`,
        status: 'failed',
        toEmail,
        error: result.error,
      })
    }
  }

  const updated = await updateFollowUpStats(id, followUp.id, {
    sentAt: new Date().toISOString(),
    sentCount: deliveredIds.length,
    failedCount: Math.max(0, errors.length - deferredIds.length),
    deferredCount: deferredIds.length,
  })

  if (deliveredIds.length === 0 && deferredIds.length === 0) {
    return NextResponse.json(
      {
        error: errors[0] || 'Provedor de email recusou o envio',
        errors,
        followUp: updated || followUp,
        delivered: 0,
        from,
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    followUp: updated || followUp,
    sent: deliveredIds.length,
    delivered: deliveredIds.length,
    deferred: deferredIds.length,
    failed: Math.max(0, errors.length - deferredIds.length),
    errors: errors.length ? errors : undefined,
    from,
    local: false,
    recipients: targets.length,
  })
}
