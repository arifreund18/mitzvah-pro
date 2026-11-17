/**
 * SES account / per-event sending limits.
 *
 * Sandbox (EMAIL_SES_PRODUCTION ≠ true): ~1 msg/s and 200/24h.
 * Production: no local daily cap (AWS enforces account quota), but keep a
 * conservative per-event pacing ceiling well below the account max rate
 * (e.g. 14/s) so new mail.{slug} subdomains warm gradually.
 */

export type SendErrorKind =
  | 'throttled'
  | 'daily_limit'
  | 'unverified_recipient'
  | 'other'

const SANDBOX_MIN_INTERVAL_MS = 1000
const SANDBOX_DAILY_CAP = 200
/** Default production pacing: 2 msg/s per process — far below typical account max (~14/s). */
const PRODUCTION_DEFAULT_MAX_PER_SECOND = 2

let lastSendAt = 0
const sendTimestamps: number[] = []

export function sesSandboxMode(): boolean {
  if ((process.env.EMAIL_PROVIDER || '').trim().toLowerCase() === 'resend') return false
  return process.env.EMAIL_SES_PRODUCTION !== 'true'
}

/**
 * Minimum gap between SES sends in this process.
 * Override with EMAIL_SES_MIN_INTERVAL_MS, or in production with
 * EMAIL_SES_EVENT_MAX_PER_SECOND (default 2).
 */
export function sesMinIntervalMs(): number {
  const rawInterval = Number(process.env.EMAIL_SES_MIN_INTERVAL_MS)
  if (Number.isFinite(rawInterval) && rawInterval >= 0) return rawInterval

  if (sesSandboxMode()) return SANDBOX_MIN_INTERVAL_MS

  const rawRate = Number(process.env.EMAIL_SES_EVENT_MAX_PER_SECOND)
  const rate =
    Number.isFinite(rawRate) && rawRate > 0 ? rawRate : PRODUCTION_DEFAULT_MAX_PER_SECOND
  return Math.max(1, Math.ceil(1000 / rate))
}

export function sesDailyCap(): number {
  if (!sesSandboxMode()) return Number.POSITIVE_INFINITY
  const raw = Number(process.env.EMAIL_SES_DAILY_CAP)
  return Number.isFinite(raw) && raw > 0 ? raw : SANDBOX_DAILY_CAP
}

/** Effective max messages/second implied by sesMinIntervalMs (for probes/docs). */
export function sesEventMaxPerSecond(): number {
  const interval = sesMinIntervalMs()
  if (interval <= 0) return Number.POSITIVE_INFINITY
  return 1000 / interval
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

/**
 * Pace SES sends. Always applies min-interval when SES is the provider path.
 * Daily 200/24h cap only in sandbox.
 */
export async function awaitSendSlot(): Promise<{
  ok: boolean
  error?: string
  kind?: SendErrorKind
}> {
  if ((process.env.EMAIL_PROVIDER || '').trim().toLowerCase() === 'resend') {
    return { ok: true }
  }

  const now = Date.now()
  pruneDay(now)

  if (sesSandboxMode() && sendTimestamps.length >= sesDailyCap()) {
    return {
      ok: false,
      error: `Limite SES sandbox de ${sesDailyCap()} e-mails/24h atingido`,
      kind: 'daily_limit',
    }
  }

  const interval = sesMinIntervalMs()
  if (interval > 0) {
    const wait = Math.max(0, lastSendAt + interval - now)
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
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
