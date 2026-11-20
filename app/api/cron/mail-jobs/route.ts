import { NextResponse } from 'next/server'
import { authorizeCron } from '@/lib/platform/cron-auth'
import { listResumableMailJobs } from '@/lib/platform/mail-queue'
import { apexHost, protocolFor } from '@/lib/platform/site-url'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * M3: resume mail jobs left pending when the dashboard tab closed mid-batch.
 * Hourly on Vercel; only touches jobs stale for ~2 minutes.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobs = await listResumableMailJobs(120_000)
  if (!jobs.length) {
    return NextResponse.json({ ok: true, resumed: 0, jobs: [] })
  }

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    process.env.VERCEL_URL ||
    process.env.NEXT_PUBLIC_SITE_HOST ||
    'mitzvah.pro'
  const apex = apexHost(host.replace(/:\d+$/, ''))
  const base = `${protocolFor(apex)}://${apex}`
  const secret = process.env.CRON_SECRET?.trim() || ''
  const authHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
  }

  const results: Array<{ jobId: string; eventId: string; ok: boolean; status?: number }> = []
  for (const job of jobs.slice(0, 10)) {
    const url = `${base}/api/platform/events/${encodeURIComponent(job.eventId)}/send/process`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ jobId: job.id }),
      })
      results.push({
        jobId: job.id,
        eventId: job.eventId,
        ok: res.ok,
        status: res.status,
      })
    } catch {
      results.push({ jobId: job.id, eventId: job.eventId, ok: false })
    }
  }

  return NextResponse.json({
    ok: true,
    resumed: results.filter((item) => item.ok).length,
    jobs: results,
  })
}
