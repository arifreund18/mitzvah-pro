import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
import { getResend } from '@/lib/email/send'
import { probeVercelDns, vercelDnsConfigured } from '@/lib/email/vercel-dns'
import { eventMailIsolationEnabled } from '@/lib/platform/mail-domain'
import { storageDriver } from '@/lib/platform/store'

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied
  const dns = await probeVercelDns()
  return NextResponse.json({
    resend: Boolean(getResend()),
    resendFromEmail: Boolean(process.env.RESEND_FROM_EMAIL),
    eventMailIsolation: eventMailIsolationEnabled(),
    vercelDns: vercelDnsConfigured(),
    vercelTeamId: Boolean(process.env.VERCEL_TEAM_ID),
    vercelDnsReachable: dns.ok,
    vercelDnsAuthMode: dns.authMode || null,
    vercelDnsError: dns.error || null,
    vercelDnsRecords: dns.recordCount ?? null,
    storageDriver: storageDriver(),
    siteHost: process.env.NEXT_PUBLIC_SITE_HOST || 'mitzvah.pro',
  })
}
