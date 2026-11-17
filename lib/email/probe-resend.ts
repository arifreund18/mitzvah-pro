import { getResend } from '@/lib/email/send'

export type ResendProbe = {
  configured: boolean
  ok: boolean
  error?: string
  fromEmailConfigured: boolean
}

export async function probeResend(): Promise<ResendProbe> {
  const fromEmailConfigured = Boolean(process.env.RESEND_FROM_EMAIL)
  const resend = getResend()
  if (!resend) {
    return {
      configured: false,
      ok: false,
      error: 'RESEND_API_KEY ausente',
      fromEmailConfigured,
    }
  }
  try {
    const listed = await resend.domains.list({ limit: 1 })
    if (listed.error) {
      return {
        configured: true,
        ok: false,
        error: listed.error.message || 'RESEND_API_KEY inválida',
        fromEmailConfigured,
      }
    }
    return { configured: true, ok: true, fromEmailConfigured }
  } catch (error) {
    return {
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao contactar Resend',
      fromEmailConfigured,
    }
  }
}
