import { getSesIdentityStatus, emailIdentityFromAddress } from '@/lib/email/ses-identity'
import { probeResend, type ResendProbe } from '@/lib/email/probe-resend'
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
  identity?: string
  verified?: boolean
  dkimStatus?: string
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
  if (!sesConfigured()) {
    return {
      configured: false,
      ok: false,
      error: !process.env.AWS_ACCESS_KEY_ID
        ? 'AWS_ACCESS_KEY_ID ausente'
        : !process.env.AWS_SECRET_ACCESS_KEY
          ? 'AWS_SECRET_ACCESS_KEY ausente'
          : 'SES_FROM_EMAIL (ou RESEND_FROM_EMAIL) ausente',
      region,
      fromEmailConfigured,
    }
  }
  const identity = emailIdentityFromAddress(from!)
  const status = await getSesIdentityStatus(identity)
  if (status.error && status.verificationStatus === 'NOT_FOUND') {
    return {
      configured: true,
      ok: false,
      error: status.error,
      region,
      fromEmailConfigured,
      identity,
      verified: false,
      dkimStatus: status.dkimStatus,
      dnsRecords: status.dnsRecords,
    }
  }
  return {
    configured: true,
    ok: status.verified,
    error: status.verified
      ? undefined
      : status.error ||
        `Identidade SES "${identity}" ainda não verificada (DKIM: ${status.dkimStatus})`,
    region,
    fromEmailConfigured,
    identity,
    verified: status.verified,
    dkimStatus: status.dkimStatus,
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
