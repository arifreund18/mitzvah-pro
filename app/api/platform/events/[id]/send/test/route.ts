import { NextResponse } from 'next/server'
import { getEvent, appendEmailLog } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import { getResend } from '@/lib/email/send'
import { provisionEventMailDomain, refreshEventMailDomain } from '@/lib/email/provision-domain'
import { eventSendFrom } from '@/lib/platform/mail-domain'
import { mailHtml, mailSubject } from '@/lib/platform/mail'
import { normalizeGuest } from '@/lib/platform/normalize-guest'
import { updateEvent } from '@/lib/platform/store'
import type { EventConfig } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as {
    kind?: 'std' | 'invite'
    to?: string
  } | null
  const kind = body?.kind
  const to = body?.to?.trim().toLowerCase() || ''
  if (kind !== 'std' && kind !== 'invite') {
    return NextResponse.json({ error: 'Informe kind: std ou invite' }, { status: 400 })
  }
  if (!to || !isEmail(to)) {
    return NextResponse.json({ error: 'Informe um email válido em to' }, { status: 400 })
  }
  if (kind === 'std' && !event.config.saveTheDate.enabled) {
    return NextResponse.json({ error: 'Save the Date está desativado neste evento' }, { status: 400 })
  }

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    new URL(request.url).host

  let config: EventConfig = event.config
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
  const resend = getResend()
  const sample = normalizeGuest({
    familyName: 'Família Teste',
    email: to,
    emails: [to],
    partySize: 2,
    status: 'pending',
    inviteLocale: config.locales.default,
    scheduleInviteMode: 'all',
    scheduleItemIds: [],
    openRsvp: config.rsvp.openRsvpDefault,
  })

  if (!resend) {
    await appendEmailLog({
      eventId: id,
      familyId: null,
      type: `test-${kind}`,
      status: 'local',
      toEmail: to,
      error: 'RESEND_API_KEY ausente',
    })
    return NextResponse.json({
      ok: true,
      local: true,
      warning: 'RESEND_API_KEY ausente — teste não enviado de verdade.',
      to,
      kind,
    })
  }
  if (!from) {
    return NextResponse.json(
      {
        error:
          config.domain.mail?.lastError ||
          'Sem remetente: verifique o domínio isolado ou defina RESEND_FROM_EMAIL.',
        mail: config.domain.mail,
      },
      { status: 502 },
    )
  }

  const result = await resend.emails.send({
    from,
    to,
    subject: `[TESTE] ${mailSubject(kind, config, sample)}`,
    html: mailHtml(kind, config, host, sample),
  })
  if (result.error) {
    await appendEmailLog({
      eventId: id,
      familyId: null,
      type: `test-${kind}`,
      status: 'failed',
      toEmail: to,
      error: result.error.message,
    })
    return NextResponse.json({ error: result.error.message }, { status: 502 })
  }

  await appendEmailLog({
    eventId: id,
    familyId: null,
    type: `test-${kind}`,
    status: 'sent',
    toEmail: to,
    resendId: (result.data as { id?: string } | null)?.id || null,
  })

  return NextResponse.json({
    ok: true,
    local: false,
    to,
    kind,
    from,
    resendId: (result.data as { id?: string } | null)?.id || null,
  })
}
