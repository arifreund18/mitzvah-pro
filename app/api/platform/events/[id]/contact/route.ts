import { NextRequest, NextResponse } from 'next/server'
import { getResend } from '@/lib/email/send'
import { eventSendFrom } from '@/lib/platform/mail-domain'
import { consumeRateLimit } from '@/lib/platform/rate-limit'
import { getEvent } from '@/lib/platform/store'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(4000),
})

export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const limited = await consumeRateLimit(`event-contact:${id}:${ip}`, 5, 60 * 60 * 1000)
  if (!limited.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const event = await getEvent(id)
  if (!event || event.status !== 'published') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (!event.config.contact.formEnabled) {
    return NextResponse.json({ error: 'form_disabled' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const recipients = Array.from(
    new Set(
      [
        ...event.config.contact.people.map((p) => p.email),
        ...event.config.rsvp.notifyEmails,
        event.config.contact.email,
      ]
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
  if (!recipients.length) {
    return NextResponse.json({ error: 'no_recipients' }, { status: 503 })
  }

  const resend = getResend()
  const from = eventSendFrom(event.config) || process.env.RESEND_FROM_EMAIL
  if (!resend || !from) {
    return NextResponse.json({ error: 'email_unavailable' }, { status: 503 })
  }

  const { name, email, message } = parsed.data
  const honoree = event.config.basics.honoreeName || event.slug
  const { error } = await resend.emails.send({
    from,
    to: recipients,
    replyTo: email,
    subject: `[${honoree}] Contact — ${name}`,
    html: `
      <p><strong>New message from the event site</strong></p>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `,
  })

  if (error) {
    return NextResponse.json({ error: 'send_failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
