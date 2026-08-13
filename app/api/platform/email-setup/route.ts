import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
import { getResend } from '@/lib/email/send'
import { probeVercelDns, vercelDnsConfigured } from '@/lib/email/vercel-dns'

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied
  const dns = await probeVercelDns()
  return NextResponse.json({
    resend: Boolean(getResend()),
    vercelDns: vercelDnsConfigured(),
    vercelTeamId: Boolean(process.env.VERCEL_TEAM_ID),
    vercelDnsReachable: dns.ok,
    vercelDnsError: dns.error || null,
    vercelDnsRecords: dns.recordCount ?? null,
    siteHost: process.env.NEXT_PUBLIC_SITE_HOST || 'mitzvah.pro',
  })
}
