import { NextResponse } from 'next/server'
import { getEvent, markMailSent, updateEvent } from '@/lib/platform/store'
import { requireSession } from '@/lib/platform/session'
import { getResend } from '@/lib/email/send'
import { provisionEventMailDomain, refreshEventMailDomain } from '@/lib/email/provision-domain'
import { eventMailIsolationEnabled, eventSendFrom } from '@/lib/platform/mail-domain'
import { mailHtml, mailSubject } from '@/lib/platform/mail'

type Ctx = { params: Promise<{ id: string }> }

export const maxDuration = 30

export async function POST(request: Request, ctx: Ctx) {
  const denied = await requireSession()
  if (denied) return denied
  const { id } = await ctx.params
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

  // Refresh/clear mail metadata; when isolation is off this just marks skipped + shared from.
  if (
    eventMailIsolationEnabled() &&
    config.domain.mail?.status === 'pending' &&
    config.domain.mail.resendDomainId
  ) {
    const mail = await refreshEventMailDomain(config.domain.mail)
    if (mail.status !== config.domain.mail.status) {
      const updated = await updateEvent(id, {
        config: { ...config, domain: { ...config.domain, mail } },
      })
      if (updated) config = updated.config
    }
  } else if (!eventMailIsolationEnabled() && config.domain.mail?.status !== 'skipped') {
    const mail = await provisionEventMailDomain(config)
    const updated = await updateEvent(id, {
      config: { ...config, domain: { ...config.domain, mail } },
    })
    if (updated) config = updated.config
  }

  const from = eventSendFrom(config)
  if (!resend) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY ausente — não é possível enviar emails.' },
      { status: 503 },
    )
  }
  if (!from) {
    return NextResponse.json(
      {
        error:
          'Sem remetente. Defina RESEND_FROM_EMAIL com um endereço de domínio verificado no Resend.',
      },
      { status: 502 },
    )
  }

  const deliveredIds: string[] = []
  const errors: string[] = []
  for (const guest of targets) {
    const result = await resend.emails.send({
      from,
      to: guest.email,
      subject: mailSubject(kind, config),
      html: mailHtml(kind, config, host, guest),
    })
    if (!result.error) {
      deliveredIds.push(guest.id)
    } else {
      errors.push(`${guest.email}: ${result.error.message}`)
    }
  }

  if (deliveredIds.length === 0) {
    return NextResponse.json(
      {
        error: errors[0] || 'Resend recusou o envio',
        errors,
        delivered: 0,
        from,
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
    sharedSender: !eventMailIsolationEnabled(),
  })
}
