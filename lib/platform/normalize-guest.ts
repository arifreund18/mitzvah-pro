import { uid } from './ids.ts'
import { familyToken } from './tokens.ts'
import type {
  EventLocale,
  Guest,
  GuestPerson,
  GuestRsvp,
  ScheduleInviteMode,
} from './types.ts'
import { EVENT_LOCALES, SCHEDULE_INVITE_MODES } from './types.ts'

function asLocale(value: string | undefined, fallback: EventLocale): EventLocale {
  if (value && (EVENT_LOCALES as readonly string[]).includes(value)) return value as EventLocale
  return fallback
}

function asScheduleMode(value: string | undefined): ScheduleInviteMode {
  if (value && (SCHEDULE_INVITE_MODES as readonly string[]).includes(value)) {
    return value as ScheduleInviteMode
  }
  return 'all'
}

function asRsvp(value: string | undefined): GuestRsvp {
  return value === 'yes' || value === 'no' ? value : 'pending'
}

function aggregateStatus(people: GuestPerson[]): GuestRsvp {
  if (!people.length) return 'pending'
  if (people.every((p) => p.status === 'no')) return 'no'
  if (people.some((p) => p.status === 'yes')) return 'yes'
  if (people.every((p) => p.status === 'pending')) return 'pending'
  return 'pending'
}

export function normalizePerson(row: Partial<GuestPerson> & { name?: string }): GuestPerson {
  return {
    id: row.id || uid(),
    name: row.name || '',
    type: row.type === 'child' ? 'child' : 'adult',
    status: asRsvp(row.status),
    meal: row.meal || '',
    dietary: row.dietary || '',
  }
}

export function normalizeGuest(row: Partial<Guest> & { familyName?: string }): Guest {
  const emailsRaw = Array.isArray(row.emails) ? row.emails : []
  const primary = (row.email || emailsRaw[0] || '').trim()
  const emails = Array.from(
    new Set([primary, ...emailsRaw.map((e) => String(e).trim())].filter(Boolean)),
  )
  let people = Array.isArray(row.people)
    ? row.people.map((p) => normalizePerson(p))
    : []
  if (!people.length) {
    const size = Math.max(1, Number(row.partySize) || 1)
    people = Array.from({ length: size }, (_, i) =>
      normalizePerson({
        name: i === 0 ? row.familyName || 'Guest' : `${row.familyName || 'Guest'} ${i + 1}`,
        type: 'adult',
        status: asRsvp(row.status),
        meal: row.meal || '',
        dietary: row.dietary || '',
      }),
    )
  }
  const status = people.length ? aggregateStatus(people) : asRsvp(row.status)
  return {
    id: row.id || uid(),
    familyName: row.familyName || '',
    email: emails[0] || '',
    emails,
    partySize: people.length || Math.max(1, Number(row.partySize) || 1),
    status,
    meal: row.meal || people[0]?.meal || '',
    dietary: row.dietary || people[0]?.dietary || '',
    message: row.message || '',
    createdAt: row.createdAt || new Date().toISOString(),
    token: row.token || familyToken(),
    inviteLocale: asLocale(row.inviteLocale, 'pt'),
    scheduleInviteMode: asScheduleMode(row.scheduleInviteMode),
    scheduleItemIds: Array.isArray(row.scheduleItemIds) ? row.scheduleItemIds.map(String) : [],
    openRsvp: Boolean(row.openRsvp),
    notes: row.notes || '',
    people,
    stdSentAt: row.stdSentAt ?? null,
    inviteSentAt: row.inviteSentAt ?? null,
    stdOpenedAt: row.stdOpenedAt ?? null,
    invitationOpenedAt: row.invitationOpenedAt ?? null,
  }
}
