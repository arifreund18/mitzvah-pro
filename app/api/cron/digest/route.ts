import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getResend } from '@/lib/email/send'
import { authorizeCron } from '@/lib/platform/cron-auth'
import {
  calendarDateInTz,
  eventTimeZone,
  isoWeekKeyInTz,
  yearMonthInTz,
} from '@/lib/platform/event-tz'
import { eventSendFrom } from '@/lib/platform/mail-domain'
import {
  appendEmailLog,
  listEmailLogs,
  loadPlatformStoreForCron,
} from '@/lib/platform/store'
import type { EmailLog, Guest, PlatformEvent } from '@/lib/platform/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type DigestMeta = {
  fingerprint: string
  guestFingerprints: Record<string, string>
}

function periodType(mode: 'daily' | 'weekly' | 'monthly', now = new Date()): string {
  if (mode === 'daily') return `digest-daily-${calendarDateInTz(now)}`
  if (mode === 'weekly') return `digest-weekly-${isoWeekKeyInTz(now)}`
  return `digest-monthly-${yearMonthInTz(now)}`
}

function guestFingerprint(guest: Guest): string {
  const people = (guest.people || [])
    .map((p) => `${p.id}:${p.type}:${p.status}`)
    .sort()
    .join(',')
  return `${guest.status}:${guest.partySize}:${people}`
}

function buildMeta(guests: Guest[]): DigestMeta {
  const guestFingerprints: Record<string, string> = {}
  for (const guest of guests) {
    guestFingerprints[guest.id] = guestFingerprint(guest)
  }
  const fingerprint = createHash('sha256')
    .update(
      Object.keys(guestFingerprints)
        .sort()
        .map((id) => `${id}=${guestFingerprints[id]}`)
        .join('|'),
    )
    .digest('hex')
  return { fingerprint, guestFingerprints }
}

function parseMeta(log: EmailLog | undefined): DigestMeta | null {
  if (!log?.error) return null
  try {
    const parsed = JSON.parse(log.error) as DigestMeta
    if (!parsed?.fingerprint || typeof parsed.guestFingerprints !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function latestDigest(logs: EmailLog[], eventId: string): EmailLog | undefined {
  return logs
    .filter(
      (log) =>
        log.eventId === eventId &&
        log.status === 'sent' &&
        (log.type === 'digest' || log.type.startsWith('digest-')),
    )
    .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))[0]
}

function changedSince(guests: Guest[], previous: DigestMeta | null): Guest[] {
  if (!previous) {
    return guests.filter((g) => g.status === 'yes' || g.status === 'no')
  }
  return guests.filter((guest) => {
    const next = guestFingerprint(guest)
    const prev = previous.guestFingerprints[guest.id]
    if (prev === next) return false
    return guest.status === 'yes' || guest.status === 'no' || Boolean(prev)
  })
}

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function digestHtml(event: PlatformEvent, changes: Guest[]): string {
  const yes = event.guests.filter((g) => g.status === 'yes').length
  const no = event.guests.filter((g) => g.status === 'no').length
  const pending = event.guests.filter((g) => g.status === 'pending').length
  const rows = changes
    .map((guest) => {
      const adults = (guest.people || []).filter((p) => p.type === 'adult').length
      const children = (guest.people || []).filter((p) => p.type === 'child').length
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${escape(guest.familyName)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${guest.status}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${guest.partySize}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${adults}/${children}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${escape(guest.email || '—')}</td>
      </tr>`
    })
    .join('')
  return `<div style="font-family:Georgia,serif;line-height:1.5">
    <p><strong>${escape(event.config.basics.honoreeName || event.slug)}</strong></p>
    <p>Totais: Sim ${yes} · Não ${no} · Pendente ${pending}</p>
    <p>${changes.length} RSVP(s) desde o último digest:</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <thead>
        <tr>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #ccc">Família</th>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #ccc">RSVP</th>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #ccc">Pessoas</th>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #ccc">A/C</th>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #ccc">Email</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="5" style="padding:6px 8px">Sem alterações</td></tr>'}</tbody>
    </table>
  </div>`
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const store = await loadPlatformStoreForCron()
  const logs = await listEmailLogs()
  const resend = getResend()
  const sent: Array<{
    eventId: string
    mode: string
    to: string
    status: string
    changes: number
  }> = []

  for (const event of store.events) {
    if (event.status !== 'published' && event.status !== 'approved') continue
    const mode = event.config.rsvp.notifyMode
    if (mode !== 'daily' && mode !== 'weekly' && mode !== 'monthly') continue
    const recipients = event.config.rsvp.notifyEmails.map((e) => e.trim()).filter(Boolean)
    if (!recipients.length) continue

    const type = periodType(mode)
    const alreadyThisPeriod = logs.some(
      (log) => log.eventId === event.id && log.type === type && log.status === 'sent',
    )
    if (alreadyThisPeriod) continue

    const previous = parseMeta(latestDigest(logs, event.id))
    const meta = buildMeta(event.guests)
    if (previous?.fingerprint === meta.fingerprint) continue

    const changes = changedSince(event.guests, previous)
    if (!changes.length) continue

    const from = eventSendFrom(event.config) || process.env.RESEND_FROM_EMAIL
    const html = digestHtml(event, changes)
    const metaJson = JSON.stringify(meta)
    const subject = `Digest RSVP (${mode}) — ${event.config.basics.honoreeName || event.slug}`

    for (const to of recipients) {
      let status = 'queued'
      let resendId: string | null = null
      let error = metaJson
      if (resend && from) {
        const result = await resend.emails.send({ from, to, subject, html })
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
      sent.push({ eventId: event.id, mode, to, status, changes: changes.length })
    }
  }

  return NextResponse.json({ ok: true, processed: sent.length, sent, tz: eventTimeZone() })
}
