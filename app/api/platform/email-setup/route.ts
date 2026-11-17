import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
import { probeEmailSetup } from '@/lib/email/probe-email'
import { probeVercelDns, vercelDnsConfigured } from '@/lib/email/vercel-dns'
import { isEphemeralServerStorage, storageDriver } from '@/lib/platform/store'

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied
  const [dns, email] = await Promise.all([probeVercelDns(), probeEmailSetup()])
  return NextResponse.json({
    provider: email.provider,
    ses: email.ses.configured,
    sesOk: email.ses.ok,
    sesError: email.ses.error || null,
    sesRegion: email.ses.region,
    sesFromEmail: email.ses.fromEmail || null,
    sesIdentity: email.ses.identity || null,
    sesVerified: email.ses.verified ?? null,
    sesDkimStatus: email.ses.dkimStatus || null,
    sesSandbox: email.ses.sandbox ?? null,
    sesSentInLast24h: email.ses.sentInLast24h ?? null,
    sesDailyCap: email.ses.dailyCap ?? null,
    sesDnsRecords: email.ses.dnsRecords || null,
    resend: email.resend.configured,
    resendOk: email.resend.ok,
    resendError: email.resend.error || null,
    resendFromEmail: email.resend.fromEmailConfigured,
    // Vercel DNS is for site subdomains only (not email).
    vercelDns: vercelDnsConfigured(),
    vercelDnsReachable: dns.ok,
    vercelDnsError: dns.error || null,
    storageDriver: storageDriver(),
    ephemeralStorage: isEphemeralServerStorage(),
    siteHost: process.env.NEXT_PUBLIC_SITE_HOST || 'mitzvah.pro',
  })
}
