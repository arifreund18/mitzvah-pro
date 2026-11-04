import { NextRequest, NextResponse } from 'next/server'
import { getResend } from '@/lib/email/send'
import { authorizeCron } from '@/lib/platform/cron-auth'
import { calendarDateInTz, eventTimeZone, isoWeekKeyInTz, yearMonthInTz } from '@/lib/platform/event-tz'
import { eventSendFrom } from '@/lib/platform/mail-domain'
import {
  appendEmailLog,
  listEmailLogs,
  loadPlatformStoreForCron,
} from '@/lib/platform/store'
import type { PlatformEvent } from '@/lib/platform/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function digestKey(mode: 'daily' | 'weekly' | 'monthly', now = new Date()): string {
  if (mode === 'daily') return `digest-daily-${calendarDateInTz(now)}`
  if (mode === 'weekly') return `digest-weekly-${isoWeekKeyInTz(now)}`
  return `digest-monthly-${yearMonthInTz(now)}`
}

function summarize(event: PlatformEvent): string {
  const yes = event.guests.filter((g) => g.status === 'yes').length
  const no = event.guests.filter((g) => g.status === 'no').length
  const pending = event.guests.filter((g) => g.status === 'pending').length
  const lines = event.guests
    .filter((g) => g.status === 'yes' || g.status === 'no')
    .slice(0, 40)
    .map((g) => `• ${g.familyName}: ${g.status}`)
  return `<p><strong>${event.config.basics.honoreeName || event.slug}</strong></p>
    <p>Sim: ${yes} · Não: ${no} · Pendente: ${pending}</p>
    <ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>`
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const store = await loadPlatformStoreForCron()
  const logs = await listEmailLogs()
  const resend = getResend()
  const sent: Array<{ eventId: string; mode: string; to: string; status: string }> = []

  for (const event of store.events) {
    if (event.status !== 'published') continue
    const mode = event.config.rsvp.notifyMode
    if (mode !== 'daily' && mode !== 'weekly' && mode !== 'monthly') continue
    const recipients = event.config.rsvp.notifyEmails.filter(Boolean)
    if (!recipients.length) continue

    const type = digestKey(mode)
    const already = logs.some(
      (log) => log.eventId === event.id && log.type === type && log.status === 'sent',
    )
    if (already) continue

    const from = eventSendFrom(event.config) || process.env.RESEND_FROM_EMAIL
    const html = summarize(event)
    for (const to of recipients) {
      let status = 'queued'
      let resendId: string | null = null
      let error = ''
      if (resend && from) {
        const result = await resend.emails.send({
          from,
          to,
          subject: `Digest RSVP (${mode}) — ${event.config.basics.honoreeName || event.slug}`,
          html,
        })
        if (result.error) {
          status = 'failed'
          error = result.error.message
        } else {
          status = 'sent'
          resendId = (result.data as { id?: string } | null)?.id || null
        }
      }
      await appendEmailLog({
        eventId: event.id,
        familyId: null,
        type,
        status,
        toEmail: to,
        resendId,
        error,
      })
      sent.push({ eventId: event.id, mode, to, status })
    }
  }

  return NextResponse.json({ ok: true, processed: sent.length, sent, tz: eventTimeZone() })
}
