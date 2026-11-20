import { NextRequest, NextResponse } from 'next/server'
import { isEmailConfigured, sendEmail } from '@/lib/email/send'
import { authorizeCron } from '@/lib/platform/cron-auth'
import { daysUntilEventDate, eventTimeZone } from '@/lib/platform/event-tz'
import {
  eventHostReplyTo,
  eventMailConfigurationSet,
  eventSendFrom,
} from '@/lib/platform/mail-domain'
import {
  guestMatchesReminderAudience,
  resolveReminderAudience,
} from '@/lib/platform/reminder-audience'
import {
  mailFollowUpScheduleHtml,
  mailFollowUpScheduleSubject,
} from '@/lib/platform/follow-up-schedule-mail'
import {
  appendEmailLog,
  hasSentEmailLog,
  loadPlatformStoreForCron,
} from '@/lib/platform/store'
import type { Guest, PlatformEvent, ReminderAudience } from '@/lib/platform/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CRON_TIME_BUDGET_MS = 45_000

function guestEmails(guest: Guest): string[] {
  const list = guest.emails?.length ? guest.emails : guest.email ? [guest.email] : []
  return Array.from(new Set(list.map((e) => e.trim().toLowerCase()).filter(Boolean)))
}

function selectWindow(
  days: number,
  windows: Array<{ days: 30 | 7 | 2; enabled: boolean; audience: ReminderAudience }>,
) {
  return windows
    .filter((w) => w.enabled && days <= w.days)
    .sort((a, b) => a.days - b.days)[0]
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const store = await loadPlatformStoreForCron()
  const emailReady = isEmailConfigured()
  const jobs: Array<{
    eventId: string
    guestId: string
    days: number
    to: string
    status: string
  }> = []
  const eventErrors: Array<{ eventId: string; error: string }> = []
  const deadline = Date.now() + CRON_TIME_BUDGET_MS
  let stoppedEarly = false

  for (const event of store.events) {
    if (Date.now() >= deadline) {
      stoppedEarly = true
      break
    }
    try {
      if (event.status !== 'published') continue
      const schedule = event.config.followUpSchedule
      if (!schedule?.enabled) continue
      const days = daysUntilEventDate(event.config.basics.date)
      if (days === null || days < 0) continue

      const windows: Array<{ days: 30 | 7 | 2; enabled: boolean; audience: ReminderAudience }> = [
        {
          days: 30,
          enabled: schedule.d30,
          audience: resolveReminderAudience(30, schedule),
        },
        {
          days: 7,
          enabled: schedule.d7,
          audience: resolveReminderAudience(7, schedule),
        },
        {
          days: 2,
          enabled: schedule.d2,
          audience: resolveReminderAudience(2, schedule),
        },
      ]
      const hit = selectWindow(days, windows)
      if (!hit) continue

      for (const guest of event.guests) {
        if (Date.now() >= deadline) {
          stoppedEarly = true
          break
        }
        if (!guestMatchesReminderAudience(guest, hit.audience)) continue
        const emails = guestEmails(guest)
        if (!emails.length) continue

        for (const to of emails) {
          if (Date.now() >= deadline) {
            stoppedEarly = true
            break
          }
          const type = `followup-auto-d${hit.days}`
          const already = await hasSentEmailLog({
            eventId: event.id,
            familyId: guest.id,
            type,
            toEmail: to,
          })
          if (already) continue

          const sent = await sendFollowUpSchedule({
            event,
            guest,
            to,
            days: hit.days,
            emailReady,
          })
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
            messageId: sent.messageId,
            error: sent.error,
          })
        }
      }
    } catch (error) {
      eventErrors.push({
        eventId: event.id,
        error: error instanceof Error ? error.message : 'event_failed',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: jobs.length,
    jobs,
    eventErrors,
    stoppedEarly,
    tz: eventTimeZone(),
  })
}

async function sendFollowUpSchedule({
  event,
  guest,
  to,
  days,
  emailReady,
}: {
  event: PlatformEvent
  guest: Guest
  to: string
  days: number
  emailReady: boolean
}): Promise<{ status: string; messageId: string | null; error: string }> {
  const from =
    eventSendFrom(event.config) ||
    process.env.EMAIL_FROM_ADDRESS ||
    process.env.SES_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL
  const host =
    process.env.NEXT_PUBLIC_SITE_HOST ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    'mitzvah.pro'
  if (!emailReady || !from) {
    return { status: 'queued', messageId: null, error: 'email_unavailable' }
  }
  const result = await sendEmail({
    from,
    to,
    replyTo: eventHostReplyTo(event.config),
    configurationSetName: eventMailConfigurationSet(event.config),
    subject: mailFollowUpScheduleSubject(event.config, guest, days),
    html: mailFollowUpScheduleHtml(event.config, host, guest, days),
  })
  if (!result.ok) {
    return {
      status: result.retryable ? 'deferred' : 'failed',
      messageId: null,
      error: result.error || 'send_failed',
    }
  }
  return {
    status: 'sent',
    messageId: result.messageId,
    error: '',
  }
}
