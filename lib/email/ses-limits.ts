/**
 * SES sandbox / account sending limits.
 * Sandbox: ~1 msg/s and 200/24h. Production: disable via EMAIL_SES_PRODUCTION=true.
 */

export type SendErrorKind =
  | 'throttled'
  | 'daily_limit'
  | 'unverified_recipient'
  | 'other'

const DEFAULT_MIN_INTERVAL_MS = 1000
const DEFAULT_DAILY_CAP = 200

let lastSendAt = 0
const sendTimestamps: number[] = []

export function sesSandboxMode(): boolean {
  if ((process.env.EMAIL_PROVIDER || '').trim().toLowerCase() === 'resend') return false
  return process.env.EMAIL_SES_PRODUCTION !== 'true'
}

export function sesMinIntervalMs(): number {
  if (!sesSandboxMode()) return 0
  const raw = Number(process.env.EMAIL_SES_MIN_INTERVAL_MS)
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_MIN_INTERVAL_MS
}

export function sesDailyCap(): number {
  if (!sesSandboxMode()) return Number.POSITIVE_INFINITY
  const raw = Number(process.env.EMAIL_SES_DAILY_CAP)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAILY_CAP
}

function pruneDay(now: number) {
  const dayAgo = now - 24 * 60 * 60 * 1000
  while (sendTimestamps.length && sendTimestamps[0]! < dayAgo) {
    sendTimestamps.shift()
  }
}

export function sentInLast24h(): number {
  pruneDay(Date.now())
  return sendTimestamps.length
}

export function noteSuccessfulSend(at = Date.now()): void {
  lastSendAt = at
  sendTimestamps.push(at)
  pruneDay(at)
}

export async function awaitSendSlot(): Promise<{
  ok: boolean
  error?: string
  kind?: SendErrorKind
}> {
  if (!sesSandboxMode()) return { ok: true }

  const now = Date.now()
  pruneDay(now)
  if (sendTimestamps.length >= sesDailyCap()) {
    return {
      ok: false,
      error: `Limite SES sandbox de ${sesDailyCap()} e-mails/24h atingido`,
      kind: 'daily_limit',
    }
  }

  const interval = sesMinIntervalMs()
  const wait = Math.max(0, lastSendAt + interval - now)
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
  return { ok: true }
}

export function classifySendError(error: unknown): {
  kind: SendErrorKind
  retryable: boolean
  message: string
} {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Falha no envio'

  const name =
    error && typeof error === 'object' && 'name' in error
      ? String((error as { name: unknown }).name)
      : ''
  const lower = `${name} ${message}`.toLowerCase()

  if (
    lower.includes('too many requests') ||
    lower.includes('throttl') ||
    lower.includes('maximum sending rate') ||
    lower.includes('rate exceeded') ||
    name === 'TooManyRequestsException' ||
    name === 'Throttling'
  ) {
    return { kind: 'throttled', retryable: true, message }
  }

  if (lower.includes('daily sending quota') || lower.includes('sending quota exceeded')) {
    return { kind: 'daily_limit', retryable: true, message }
  }

  if (
    lower.includes('email address is not verified') ||
    lower.includes('not verified') ||
    lower.includes('message rejected') ||
    name === 'MessageRejected'
  ) {
    // Keep in queue until production / recipient verified — do not drop.
    return { kind: 'unverified_recipient', retryable: true, message }
  }

  return { kind: 'other', retryable: false, message }
}
