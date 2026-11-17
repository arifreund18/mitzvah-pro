import {
  SESv2Client,
  SendEmailCommand,
} from '@aws-sdk/client-sesv2'
import { Resend } from 'resend'
import {
  awaitSendSlot,
  classifySendError,
  noteSuccessfulSend,
  type SendErrorKind,
} from '@/lib/email/ses-limits'

export type EmailProviderName = 'ses' | 'resend'

export type SendEmailInput = {
  from: string
  to: string | string[]
  subject: string
  html: string
  replyTo?: string | string[]
  text?: string
  /** SES configuration set (per-event reputation / pause control). */
  configurationSetName?: string
}

export type SendEmailResult = {
  ok: boolean
  messageId: string | null
  error: string | null
  provider: EmailProviderName | 'none'
  /** When true, caller should keep the message in the queue and retry later. */
  retryable: boolean
  errorKind: SendErrorKind | null
}

let sesClient: SESv2Client | null = null

export function awsRegion(): string {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2'
}

/** Shared From address. SES uses EMAIL_FROM_ADDRESS; Resend uses RESEND_FROM_EMAIL. */
export function sharedFromEmail(): string | null {
  const provider = resolveEmailProviderForced()
  if (provider === 'resend') {
    return process.env.RESEND_FROM_EMAIL || null
  }
  if (provider === 'ses' || sesConfigured()) {
    return (
      process.env.EMAIL_FROM_ADDRESS ||
      process.env.SES_FROM_EMAIL ||
      'convites@mitzvah.pro'
    )
  }
  return process.env.RESEND_FROM_EMAIL || null
}

export function defaultFromAddress(): string {
  return sharedFromEmail() || 'convites@mitzvah.pro'
}

function resolveEmailProviderForced(): string {
  return (process.env.EMAIL_PROVIDER || '').trim().toLowerCase()
}

export function sesConfigured(): boolean {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
}

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
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
 * When unset, prefers SES if AWS credentials are present, else Resend.
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

function fail(
  provider: EmailProviderName | 'none',
  error: string,
  kind: SendErrorKind | null = 'other',
  retryable = false,
): SendEmailResult {
  return { ok: false, messageId: null, error, provider, retryable, errorKind: kind }
}

function configurationSetMissing(message: string): boolean {
  return /configuration set .+ does not exist/i.test(message)
}

/**
 * Create the per-event configuration set if needed (lazy).
 * If IAM cannot create it, return undefined so SendEmail still works.
 */
async function resolveSesConfigurationSet(
  configurationSetName: string | undefined,
): Promise<string | undefined> {
  const name = (configurationSetName || '').trim()
  if (!name) return undefined
  try {
    // Dynamic import avoids circular dependency with ses-config-set → send.
    const { ensureEventConfigurationSet } = await import('@/lib/email/ses-config-set')
    const slug = name.replace(/^mitzvah-/i, '') || 'event'
    const ensured = await ensureEventConfigurationSet(slug)
    return ensured.exists ? ensured.name : undefined
  } catch {
    return undefined
  }
}

async function sendWithSes(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getSesClient()
  if (!client) {
    return fail('none', 'AWS credentials ausentes', 'other', false)
  }

  const slot = await awaitSendSlot()
  if (!slot.ok) {
    return fail('ses', slot.error || 'SES rate limited', slot.kind, true)
  }

  const to = asList(input.to)
  const replyTo = asList(input.replyTo)
  let configurationSetName = await resolveSesConfigurationSet(input.configurationSetName)

  const sendOnce = async (configSet: string | undefined) =>
    client.send(
      new SendEmailCommand({
        FromEmailAddress: input.from,
        Destination: { ToAddresses: to },
        ReplyToAddresses: replyTo.length ? replyTo : undefined,
        ConfigurationSetName: configSet || undefined,
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

  try {
    const out = await sendOnce(configurationSetName)
    noteSuccessfulSend()
    return {
      ok: true,
      messageId: out.MessageId || null,
      error: null,
      provider: 'ses',
      retryable: false,
      errorKind: null,
    }
  } catch (error) {
    const classified = classifySendError(error)
    // Race / stale name: drop ConfigurationSetName and retry once.
    if (configurationSetName && configurationSetMissing(classified.message)) {
      try {
        const out = await sendOnce(undefined)
        noteSuccessfulSend()
        return {
          ok: true,
          messageId: out.MessageId || null,
          error: null,
          provider: 'ses',
          retryable: false,
          errorKind: null,
        }
      } catch (retryError) {
        const retryClassified = classifySendError(retryError)
        return fail('ses', retryClassified.message, retryClassified.kind, retryClassified.retryable)
      }
    }
    return fail('ses', classified.message, classified.kind, classified.retryable)
  }
}

async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getResend()
  if (!resend) {
    return fail('none', 'RESEND_API_KEY ausente', 'other', false)
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
    const classified = classifySendError(result.error.message)
    return fail('resend', result.error.message, classified.kind, classified.retryable)
  }
  const data = result.data as { id?: string } | null
  return {
    ok: true,
    messageId: data?.id || null,
    error: null,
    provider: 'resend',
    retryable: false,
    errorKind: null,
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = resolveEmailProvider()
  if (provider === 'none') {
    return fail('none', 'Nenhum provedor de email configurado', 'other', false)
  }
  if (provider === 'ses') return sendWithSes(input)
  return sendWithResend(input)
}
