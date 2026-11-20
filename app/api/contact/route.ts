import { NextRequest, NextResponse } from 'next/server'
import { isEmailConfigured, sendEmail, sharedFromEmail } from '@/lib/email/send'
import {
  MITZVAH_CONTACT_EMAIL,
  MITZVAH_CONTACT_FORWARD_TO,
} from '@/lib/contact'
import { consumeRateLimit } from '@/lib/platform/rate-limit'
import { contactSchema } from '@/lib/validations'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const limited = await consumeRateLimit(`site-contact:${ip}`, 5, 60 * 60 * 1000)
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 })
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: false, error: 'email_unavailable' }, { status: 503 })
  }

  const from = sharedFromEmail() ?? 'onboarding@resend.dev'
  const { name, email, message } = parsed.data
  const result = await sendEmail({
    from,
    to: MITZVAH_CONTACT_FORWARD_TO,
    replyTo: email,
    subject: `[Mitzvah.pro] ${name.replace(/[\r\n]+/g, ' ').slice(0, 80)}`,
    html: `
      <p><strong>Novo contato pelo site Mitzvah.pro</strong></p>
      <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      <hr>
      <p style="color:#666;font-size:12px">Encaminhado de ${escapeHtml(MITZVAH_CONTACT_EMAIL)}</p>
    `,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
