import { NextRequest, NextResponse } from 'next/server'
import { getResend } from '@/lib/email/send'
import {
  MITZVAH_CONTACT_EMAIL,
  MITZVAH_CONTACT_FORWARD_TO,
} from '@/lib/contact'
import { contactSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 })
  }

  const resend = getResend()
  if (!resend) {
    return NextResponse.json({ ok: false, error: 'email_unavailable' }, { status: 503 })
  }

  const { name, email, message } = parsed.data
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: MITZVAH_CONTACT_FORWARD_TO,
    replyTo: email,
    subject: `[Mitzvah.pro] ${name}`,
    html: `
      <p><strong>Novo contato pelo site Mitzvah.pro</strong></p>
      <p><strong>Nome:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p style="color:#666;font-size:12px">Encaminhado de ${MITZVAH_CONTACT_EMAIL}</p>
    `,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
