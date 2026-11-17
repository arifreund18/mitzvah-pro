import { getSesIdentityStatus, emailIdentityFromAddress } from '@/lib/email/ses-identity'
import { probeResend, type ResendProbe } from '@/lib/email/probe-resend'
import { sesDailyCap, sesMinIntervalMs, sesSandboxMode, sentInLast24h } from '@/lib/email/ses-limits'
import {
  awsRegion,
  resolveEmailProvider,
  sesConfigured,
  sharedFromEmail,
  type EmailProviderName,
} from '@/lib/email/send'

export type SesProbe = {
  configured: boolean
  ok: boolean
  error?: string
  region: string
  fromEmailConfigured: boolean
  fromEmail?: string
  identity?: string
  verified?: boolean
  dkimStatus?: string
  sandbox?: boolean
  sentInLast24h?: number
  dailyCap?: number
  minIntervalMs?: number
  dnsRecords?: Array<{ type: string; name: string; value: string; purpose: string }>
}

export type EmailSetupProbe = {
  provider: EmailProviderName | 'none'
  ses: SesProbe
  resend: ResendProbe
}

export async function probeSes(): Promise<SesProbe> {
  const from = sharedFromEmail()
  const fromEmailConfigured = Boolean(from)
  const region = awsRegion()
  const sandbox = sesSandboxMode()
  if (!sesConfigured()) {
    return {
      configured: false,
      ok: false,
      error: !process.env.AWS_ACCESS_KEY_ID
        ? 'AWS_ACCESS_KEY_ID ausente'
        : 'AWS_SECRET_ACCESS_KEY ausente',
      region,
      fromEmailConfigured,
      fromEmail: from || undefined,
      sandbox,
    }
  }
  const identity = emailIdentityFromAddress(from || 'convites@mitzvah.pro')
  const status = await getSesIdentityStatus(identity)
  return {
    configured: true,
    ok: status.verified || !status.error,
    error: status.verified
      ? undefined
      : status.error ||
        `Identidade SES "${identity}" — confira DKIM no console (envio usa ${from}).`,
    region,
    fromEmailConfigured,
    fromEmail: from || undefined,
    identity,
    verified: status.verified,
    dkimStatus: status.dkimStatus,
    sandbox,
    sentInLast24h: sentInLast24h(),
    dailyCap: sesDailyCap(),
    minIntervalMs: sesMinIntervalMs(),
    dnsRecords: status.dnsRecords,
  }
}

export async function probeEmailSetup(): Promise<EmailSetupProbe> {
  const [ses, resend] = await Promise.all([probeSes(), probeResend()])
  return {
    provider: resolveEmailProvider(),
    ses,
    resend,
  }
}
