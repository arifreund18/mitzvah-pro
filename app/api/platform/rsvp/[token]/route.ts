import { NextResponse } from 'next/server'
import { z } from 'zod'
import { consumeRateLimit } from '@/lib/platform/rate-limit'
import { getFamilyByToken, updateGuest, appendEmailLog } from '@/lib/platform/store'
import { isEmailConfigured, sendEmail } from '@/lib/email/send'
import {
  eventHostReplyTo,
  eventMailConfigurationSet,
  eventSendFrom,
} from '@/lib/platform/mail-domain'
import { buildRsvpPeopleUpdate } from '@/lib/platform/rsvp-people'
import { isRsvpDeadlinePassed } from '@/lib/platform/rsvp-deadline'

const personSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(['adult', 'child']).optional(),
  status: z.enum(['pending', 'yes', 'no']),
  meal: z.string().optional(),
  dietary: z.string().optional(),
})

const bodySchema = z.object({
  people: z.array(personSchema).min(1).max(20),
  message: z.string().max(2000).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
})

type Ctx = { params: Promise<{ token: string }> }

export async function GET(_request: Request, ctx: Ctx) {
  const { token } = await ctx.params
  const found = await getFamilyByToken(token)
  if (!found) return NextResponse.json({ error: 'Convite inválido' }, { status: 404 })
  const { event, guest } = found
  return NextResponse.json({
    event: {
      id: event.id,
      slug: event.slug,
      status: event.status,
      config: {
        basics: event.config.basics,
        story: event.config.story,
        branding: event.config.branding,
        rsvp: event.config.rsvp,
        invitation: {
          greeting: event.config.invitation.greeting,
          body: event.config.invitation.body,
          hostLine: event.config.invitation.hostLine,
        },
        locales: event.config.locales,
        schedule: event.config.schedule,
      },
    },
    guest,
  })
}

export async function POST(request: Request, ctx: Ctx) {
  const { token } = await ctx.params
  const found = await getFamilyByToken(token)
  if (!found) return NextResponse.json({ error: 'Convite inválido' }, { status: 404 })
  const { event, guest } = found
  if (event.status !== 'published' && event.status !== 'approved') {
    return NextResponse.json({ error: 'Evento indisponível' }, { status: 403 })
  }
  if (isRsvpDeadlinePassed(event.config.rsvp.deadline)) {
    return NextResponse.json({ error: 'O prazo do RSVP já passou.' }, { status: 403 })
  }

  const limit = guest.openRsvp ? 60 : 5
  const limited = await consumeRateLimit(`rsvp:token:${token}`, limit, 60 * 60 * 1000)
  if (!limited.ok) {
    return NextResponse.json({ error: 'Muitas tentativas. Tente mais tarde.' }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const built = buildRsvpPeopleUpdate({
    existing: guest.people,
    submitted: parsed.data.people,
    openRsvp: Boolean(guest.openRsvp),
    allowPlusOne: Boolean(event.config.rsvp.allowPlusOne),
    collectMeal: Boolean(event.config.rsvp.collectMeal),
    collectDietary: Boolean(event.config.rsvp.collectDietary),
  })
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 })
  }
  const people = built.people

  if (guest.openRsvp) {
    const email = (parsed.data.contactEmail || '').trim()
    if (!email) {
      return NextResponse.json({ error: 'E-mail de contato obrigatório.' }, { status: 400 })
    }
  }

  const emails = guest.emails.length
    ? guest.emails
    : guest.email
      ? [guest.email]
      : parsed.data.contactEmail
        ? [parsed.data.contactEmail]
        : []

  const updated = await updateGuest(event.id, guest.id, {
    people,
    message: parsed.data.message || guest.message,
    email: emails[0] || guest.email,
    emails,
  })
  if (!updated) return NextResponse.json({ error: 'Falha ao guardar' }, { status: 500 })

  const emailReady = isEmailConfigured()
  const from = eventSendFrom(event.config)
  const replyTo = eventHostReplyTo(event.config)
  const configurationSetName = eventMailConfigurationSet(event.config)
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    new URL(request.url).host
  const { resolveGuestLocale } = await import('@/lib/platform/guest-locale')
  const locale = resolveGuestLocale(updated.guest, event.config)
  const { rsvpConfirmationText } = await import('@/lib/platform/guest-ui')
  const {
    mailRsvpConfirmationHtml,
    mailRsvpConfirmationSubject,
    mailRsvpHostNotifyHtml,
    mailRsvpHostNotifySubject,
  } = await import('@/lib/platform/mail')
  const confirmBody = rsvpConfirmationText(
    locale,
    updated.guest.familyName,
    event.config.rsvp.confirmationMessage,
  )
  const confirmHtml = mailRsvpConfirmationHtml(event.config, host, updated.guest)
  const confirmSubject = mailRsvpConfirmationSubject(event.config, updated.guest)

  for (const to of emails) {
    let status = 'skipped'
    let messageId: string | null = null
    let error = ''
    if (emailReady && from) {
      const result = await sendEmail({
        from,
        to,
        replyTo,
        configurationSetName,
        subject: confirmSubject,
        html: confirmHtml,
      })
      if (!result.ok) {
        status = result.retryable ? 'deferred' : 'failed'
        error = result.error || 'send_failed'
      } else {
        status = 'sent'
        messageId = result.messageId
      }
    }
    await appendEmailLog({
      eventId: event.id,
      familyId: guest.id,
      type: 'rsvp_confirmation',
      status,
      messageId,
      toEmail: to,
      error,
    })
  }

  const notify =
    event.config.rsvp.notifyMode === 'instant'
      ? Array.from(
          new Set(
            event.config.rsvp.notifyEmails
              .flatMap((entry) => String(entry).split(/[\n,;]+/))
              .map((e) => e.trim())
              .filter(Boolean),
          ),
        )
      : []
  if (emailReady && from) {
    const notifySubject = mailRsvpHostNotifySubject(event.config, updated.guest)
    const notifyHtml = mailRsvpHostNotifyHtml(event.config, updated.guest)
    for (const to of notify) {
      await sendEmail({
        from,
        to,
        replyTo,
        configurationSetName,
        subject: notifySubject,
        html: notifyHtml,
      }).catch(() => null)
    }
  }

  return NextResponse.json({
    ok: true,
    guest: updated.guest,
    confirmation: confirmBody,
  })
}
