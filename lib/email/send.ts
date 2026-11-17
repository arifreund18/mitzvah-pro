import {
  SESv2Client,
  SendEmailCommand,
} from '@aws-sdk/client-sesv2'
import { Resend } from 'resend'

export type EmailProviderName = 'ses' | 'resend'

export type SendEmailInput = {
  from: string
  to: string | string[]
  subject: string
  html: string
  replyTo?: string | string[]
  text?: string
}

export type SendEmailResult = {
  ok: boolean
  /** Generic provider message id (stored as `resendId` in email_logs for compatibility). */
  messageId: string | null
  error: string | null
  provider: EmailProviderName | 'none'
}

let sesClient: SESv2Client | null = null

export function awsRegion(): string {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2'
}

export function sesConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      (process.env.SES_FROM_EMAIL || process.env.RESEND_FROM_EMAIL),
  )
}

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

/** Shared verified From address (SES preferred, then Resend). */
export function sharedFromEmail(): string | null {
  return process.env.SES_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || null
}

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export function getSesClient(): SESv2Client | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return null
  }
  if (!sesClient) {
    sesClient = new SESv2Client({
      region: awsRegion(),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  }
  return sesClient
}

/**
 * Selectable provider: EMAIL_PROVIDER=ses|resend.
 * When unset, prefers SES if credentials + from are present, else Resend.
 * If ses is forced but unavailable, falls back to Resend when configured.
 */
export function resolveEmailProvider(): EmailProviderName | 'none' {
  const forced = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase()
  if (forced === 'ses') {
    if (sesConfigured()) return 'ses'
    if (resendConfigured()) return 'resend'
    return 'none'
  }
  if (forced === 'resend') {
    return resendConfigured() ? 'resend' : 'none'
  }
  if (sesConfigured()) return 'ses'
  if (resendConfigured()) return 'resend'
  return 'none'
}

export function isEmailConfigured(): boolean {
  return resolveEmailProvider() !== 'none'
}

function asList(value: string | string[] | undefined): string[] {
  if (!value) return []
  const list = Array.isArray(value) ? value : [value]
  return list.map((item) => item.trim()).filter(Boolean)
}

async function sendWithSes(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getSesClient()
  if (!client) {
    return { ok: false, messageId: null, error: 'AWS credentials ausentes', provider: 'none' }
  }
  const to = asList(input.to)
  const replyTo = asList(input.replyTo)
  try {
    const out = await client.send(
      new SendEmailCommand({
        FromEmailAddress: input.from,
        Destination: { ToAddresses: to },
        ReplyToAddresses: replyTo.length ? replyTo : undefined,
        Content: {
          Simple: {
            Subject: { Data: input.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: input.html, Charset: 'UTF-8' },
              ...(input.text
                ? { Text: { Data: input.text, Charset: 'UTF-8' } }
                : {}),
            },
          },
        },
      }),
    )
    return {
      ok: true,
      messageId: out.MessageId || null,
      error: null,
      provider: 'ses',
    }
  } catch (error) {
    return {
      ok: false,
      messageId: null,
      error: error instanceof Error ? error.message : 'Falha no envio SES',
      provider: 'ses',
    }
  }
}

async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getResend()
  if (!resend) {
    return { ok: false, messageId: null, error: 'RESEND_API_KEY ausente', provider: 'none' }
  }
  const result = await resend.emails.send({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
    text: input.text,
  })
  if (result.error) {
    return {
      ok: false,
      messageId: null,
      error: result.error.message,
      provider: 'resend',
    }
  }
  const data = result.data as { id?: string } | null
  return {
    ok: true,
    messageId: data?.id || null,
    error: null,
    provider: 'resend',
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = resolveEmailProvider()
  if (provider === 'none') {
    return {
      ok: false,
      messageId: null,
      error: 'Nenhum provedor de email configurado',
      provider: 'none',
    }
  }
  if (provider === 'ses') return sendWithSes(input)
  return sendWithResend(input)
}
