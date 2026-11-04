import { NextResponse } from 'next/server'
import { z } from 'zod'
import { consumeRateLimit } from '@/lib/platform/rate-limit'
import { getFamilyByToken, updateGuest, appendEmailLog } from '@/lib/platform/store'
import { getResend } from '@/lib/email/send'
import { eventSendFrom } from '@/lib/platform/mail-domain'
import { uid } from '@/lib/platform/ids'
import type { GuestPerson } from '@/lib/platform/types'

const personSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(['adult', 'child']).default('adult'),
  status: z.enum(['pending', 'yes', 'no']),
  meal: z.string().optional(),
  dietary: z.string().optional(),
})

const bodySchema = z.object({
  people: z.array(personSchema).min(1),
  message: z.string().optional(),
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

  const limit = guest.openRsvp ? 60 : 5
  const limited = await consumeRateLimit(`rsvp:token:${token}`, limit, 60 * 60 * 1000)
  if (!limited.ok) {
    return NextResponse.json({ error: 'Muitas tentativas. Tente mais tarde.' }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const existingIds = new Set(guest.people.map((p) => p.id))
  for (const p of parsed.data.people) {
    if (p.id && !existingIds.has(p.id) && !guest.openRsvp && guest.people.length > 0) {
      return NextResponse.json({ error: 'Seleção de convidados inválida.' }, { status: 400 })
    }
  }

  const people: GuestPerson[] = parsed.data.people.map((p) => ({
    id: p.id && existingIds.has(p.id) ? p.id : uid(),
    name: p.name.trim(),
    type: p.type,
    status: p.status,
    meal: event.config.rsvp.collectMeal && p.status === 'yes' ? p.meal || '' : '',
    dietary: event.config.rsvp.collectDietary ? p.dietary || '' : '',
  }))

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

  const resend = getResend()
  const from = eventSendFrom(event.config)
  const locale = updated.guest.inviteLocale || event.config.locales.default
  const { rsvpConfirmationText } = await import('@/lib/platform/guest-ui')
  const confirmBody = rsvpConfirmationText(
    locale,
    updated.guest.familyName,
    event.config.rsvp.confirmationMessage,
  )
  const dir = locale === 'he' ? 'rtl' : 'ltr'

  for (const to of emails) {
    let status = 'skipped'
    let resendId: string | null = null
    let error = ''
    if (resend && from) {
      const result = await resend.emails.send({
        from,
        to,
        subject: `RSVP — ${event.config.basics.honoreeName || event.slug}`,
        html: `<p dir="${dir}">${confirmBody.replace(/</g, '&lt;')}</p>`,
      })
      if (result.error) {
        status = 'failed'
        error = result.error.message
      } else {
        status = 'sent'
        resendId = result.data?.id || null
      }
    }
    await appendEmailLog({
      eventId: event.id,
      familyId: guest.id,
      type: 'rsvp_confirmation',
      status,
      resendId,
      toEmail: to,
      error,
    })
  }

  const notify =
    event.config.rsvp.notifyMode === 'instant'
      ? event.config.rsvp.notifyEmails.filter(Boolean)
      : []
  if (resend && from) {
    for (const to of notify) {
      await resend.emails
        .send({
          from,
          to,
          subject: `Novo RSVP — ${updated.guest.familyName}`,
          html: `<p>Família ${updated.guest.familyName} atualizou o RSVP.</p>`,
        })
        .catch(() => null)
    }
  }

  return NextResponse.json({
    ok: true,
    guest: updated.guest,
    confirmation: confirmBody,
  })
}
