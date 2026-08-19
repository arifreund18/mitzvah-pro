import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
import { probeResend } from '@/lib/email/probe-resend'
import { probeVercelDns, vercelDnsConfigured } from '@/lib/email/vercel-dns'
import { isEphemeralServerStorage, storageDriver } from '@/lib/platform/store'

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied
  const [dns, resend] = await Promise.all([probeVercelDns(), probeResend()])
  return NextResponse.json({
    resend: resend.configured,
    resendOk: resend.ok,
    resendError: resend.error || null,
    resendFromEmail: resend.fromEmailConfigured,
    vercelDns: vercelDnsConfigured(),
    vercelTeamId: Boolean(process.env.VERCEL_TEAM_ID),
    vercelDnsReachable: dns.ok,
    vercelDnsAuthMode: dns.authMode || null,
    vercelDnsError: dns.error || null,
    vercelDnsRecords: dns.recordCount ?? null,
    storageDriver: storageDriver(),
    ephemeralStorage: isEphemeralServerStorage(),
    siteHost: process.env.NEXT_PUBLIC_SITE_HOST || 'mitzvah.pro',
  })
}
