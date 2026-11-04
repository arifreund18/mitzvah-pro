import { NextRequest, NextResponse } from 'next/server'
import { getResend } from '@/lib/email/send'
import { authorizeCron } from '@/lib/platform/cron-auth'
import { daysUntilEventDate, eventTimeZone } from '@/lib/platform/event-tz'
import { reminderCopy } from '@/lib/platform/guest-ui'
import { eventSendFrom } from '@/lib/platform/mail-domain'
import {
  appendEmailLog,
  listEmailLogs,
  loadPlatformStoreForCron,
} from '@/lib/platform/store'
import { uid } from '@/lib/platform/ids'
import type { Guest, PlatformEvent } from '@/lib/platform/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function guestEmails(guest: Guest): string[] {
  const list = guest.emails?.length ? guest.emails : guest.email ? [guest.email] : []
  return Array.from(new Set(list.map((e) => e.trim().toLowerCase()).filter(Boolean)))
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const store = await loadPlatformStoreForCron()
  const existingLogs = await listEmailLogs()
  const resend = getResend()
  const jobs: Array<{
    eventId: string
    guestId: string
    days: number
    to: string
    status: string
  }> = []

  for (const event of store.events) {
    if (event.status !== 'published') continue
    const reminders = event.config.reminders
    if (!reminders?.enabled) continue
    const days = daysUntilEventDate(event.config.basics.date)
    if (days === null) continue

    const windows: Array<{ days: number; enabled: boolean }> = [
      { days: 30, enabled: reminders.d30 },
      { days: 7, enabled: reminders.d7 },
      { days: 2, enabled: reminders.d2 },
    ]
    const hit = windows.find((w) => w.enabled && w.days === days)
    if (!hit) continue

    for (const guest of event.guests) {
      if (hit.days !== 30 && reminders.onlyConfirmedForD7D2 && guest.status !== 'yes') continue
      const emails = guestEmails(guest)
      if (!emails.length) continue

      for (const to of emails) {
        const type = `reminder-d${hit.days}`
        const already = existingLogs.some(
          (log) =>
            log.eventId === event.id &&
            log.familyId === guest.id &&
            log.type === type &&
            log.toEmail === to &&
            log.status === 'sent',
        )
        if (already) continue

        const sent = await sendReminder({ event, guest, to, days: hit.days, resend })
        jobs.push({
          eventId: event.id,
          guestId: guest.id,
          days: hit.days,
          to,
          status: sent.status,
        })
        await appendEmailLog({
          eventId: event.id,
          familyId: guest.id,
          type,
          status: sent.status,
          toEmail: to,
          resendId: sent.resendId,
          error: sent.error,
        })
      }
    }
  }

  return NextResponse.json({ ok: true, processed: jobs.length, jobs, tz: eventTimeZone() })
}

async function sendReminder({
  event,
  guest,
  to,
  days,
  resend,
}: {
  event: PlatformEvent
  guest: Guest
  to: string
  days: number
  resend: ReturnType<typeof getResend>
}): Promise<{ status: string; resendId: string | null; error: string }> {
  const from = eventSendFrom(event.config) || process.env.RESEND_FROM_EMAIL
  const name = event.config.basics.honoreeName || 'Mitzvah'
  const locale = guest.inviteLocale || event.config.locales.default
  const copy = reminderCopy(
    locale,
    name,
    days,
    guest.familyName,
    event.config.reminders.message,
  )
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  if (!resend || !from) {
    return { status: 'queued', resendId: null, error: 'email_unavailable' }
  }
  const result = await resend.emails.send({
    from,
    to,
    subject: copy.subject,
    html: `<div dir="${dir}" style="font-family:Georgia,serif;line-height:1.5">
      <p>${copy.body.replace(/</g, '&lt;')}</p>
      <p style="color:#666;font-size:12px">Job ${uid()}</p>
    </div>`,
  })
  if (result.error) {
    return { status: 'failed', resendId: null, error: result.error.message }
  }
  return {
    status: 'sent',
    resendId: (result.data as { id?: string } | null)?.id || null,
    error: '',
  }
}
