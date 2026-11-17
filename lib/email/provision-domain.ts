import { defaultFromAddress, resolveEmailProvider, sharedFromEmail } from '@/lib/email/send'
import { emailIdentityFromAddress, getSesIdentityStatus } from '@/lib/email/ses-identity'
import { eventFromDisplayName, formatFromAddress } from '@/lib/platform/mail-domain'
import type { EventConfig, EventMailDomain } from '@/lib/platform/types'

/**
 * Shared sending identity only — no per-event domains, no Vercel DNS for email.
 * SES: EMAIL_FROM_ADDRESS (default convites@mitzvah.pro) + display name per event.
 * Resend: RESEND_FROM_EMAIL only (no mail.{slug} provisioning).
 */
export async function provisionEventMailDomain(config: EventConfig): Promise<EventMailDomain> {
  const provider = resolveEmailProvider()
  const display = eventFromDisplayName(config)
  const previous = config.domain.mail

  if (provider === 'ses') {
    const shared = sharedFromEmail() || defaultFromAddress()
    const identity = emailIdentityFromAddress(shared)
    const fromEmail = formatFromAddress(display, shared)
    try {
      const status = await getSesIdentityStatus(identity)
      if (status.verified) {
        return {
          sendingDomain: identity,
          fromEmail,
          resendDomainId: '',
          status: 'verified',
          lastError: '',
          verifiedAt: previous?.verifiedAt || new Date().toISOString(),
        }
      }
      // Identity may already be verified in AWS but GetEmailIdentity needs ses:GetEmailIdentity.
      // Still attach the shared From so sends work with the IAM sender.
      return {
        sendingDomain: identity,
        fromEmail,
        resendDomainId: '',
        status: status.error?.includes('AccessDenied') || status.verificationStatus === 'NOT_FOUND'
          ? 'verified'
          : 'pending',
        lastError: status.error
          ? `Consulta SES: ${status.error} — usando ${shared} (docs/SES.md).`
          : `Identidade SES "${identity}" ainda não reportada como verificada.`,
        verifiedAt: previous?.verifiedAt || new Date().toISOString(),
      }
    } catch (error) {
      return {
        sendingDomain: identity,
        fromEmail,
        resendDomainId: '',
        status: 'verified',
        lastError:
          error instanceof Error
            ? `Aviso: ${error.message}`
            : 'Aviso ao consultar SES — From compartilhado aplicado.',
        verifiedAt: previous?.verifiedAt || new Date().toISOString(),
      }
    }
  }

  if (provider === 'resend') {
    const shared = process.env.RESEND_FROM_EMAIL
    if (!shared) {
      return {
        sendingDomain: '',
        fromEmail: '',
        resendDomainId: '',
        status: 'skipped',
        lastError: 'RESEND_FROM_EMAIL ausente (modo Resend).',
        verifiedAt: null,
      }
    }
    return {
      sendingDomain: emailIdentityFromAddress(shared),
      fromEmail: formatFromAddress(display, shared),
      resendDomainId: '',
      status: 'verified',
      lastError: '',
      verifiedAt: previous?.verifiedAt || new Date().toISOString(),
    }
  }

  return {
    sendingDomain: '',
    fromEmail: '',
    resendDomainId: '',
    status: 'skipped',
    lastError: 'Nenhum provedor de email configurado (EMAIL_PROVIDER=ses|resend).',
    verifiedAt: null,
  }
}

export async function refreshEventMailDomain(mail: EventMailDomain): Promise<EventMailDomain> {
  const provider = resolveEmailProvider()
  if (provider !== 'ses') return mail

  const identity =
    mail.sendingDomain ||
    emailIdentityFromAddress(mail.fromEmail || sharedFromEmail() || defaultFromAddress())
  if (!identity) return mail

  try {
    const status = await getSesIdentityStatus(identity)
    if (status.verified) {
      return {
        ...mail,
        sendingDomain: identity,
        status: 'verified',
        lastError: '',
        verifiedAt: mail.verifiedAt || new Date().toISOString(),
      }
    }
    return {
      ...mail,
      sendingDomain: identity,
      status: mail.status === 'verified' ? 'verified' : 'pending',
      lastError:
        status.error ||
        `Aguardando verificação DNS no SES (${identity}). Ver docs/SES.md.`,
    }
  } catch (error) {
    return {
      ...mail,
      status: mail.status === 'verified' ? 'verified' : 'pending',
      lastError: error instanceof Error ? error.message : mail.lastError,
    }
  }
}
