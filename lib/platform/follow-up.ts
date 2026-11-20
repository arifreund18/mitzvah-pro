import { guestMailRecipients } from './family-emails.ts'
import { uid } from './ids.ts'
import type {
  EventConfig,
  EventLocale,
  Guest,
  HostFollowUp,
  HostFollowUpAudience,
  HostFollowUpType,
} from './types.ts'

export const HOST_FOLLOW_UP_TYPES: HostFollowUpType[] = ['reminder', 'message', 'update']
export const HOST_FOLLOW_UP_AUDIENCES: HostFollowUpAudience[] = ['all', 'yes', 'pending', 'no']

export function isHostFollowUpType(value: unknown): value is HostFollowUpType {
  return HOST_FOLLOW_UP_TYPES.includes(value as HostFollowUpType)
}

export function isHostFollowUpAudience(value: unknown): value is HostFollowUpAudience {
  return HOST_FOLLOW_UP_AUDIENCES.includes(value as HostFollowUpAudience)
}

export function normalizeFollowUp(row: Partial<HostFollowUp> & { body?: string }): HostFollowUp {
  const clientRequestId = String(row.clientRequestId || '').trim()
  return {
    id: row.id || uid(),
    type: isHostFollowUpType(row.type) ? row.type : 'message',
    body: String(row.body || '').trim(),
    subject: String(row.subject || '').trim(),
    audience: isHostFollowUpAudience(row.audience) ? row.audience : 'all',
    guestIds: Array.isArray(row.guestIds)
      ? [...new Set(row.guestIds.map((id) => String(id || '').trim()).filter(Boolean))]
      : [],
    clientRequestId: clientRequestId || undefined,
    createdAt: row.createdAt || new Date().toISOString(),
    sentAt: row.sentAt || null,
    sentCount: Math.max(0, Number(row.sentCount) || 0),
    failedCount: Math.max(0, Number(row.failedCount) || 0),
    deferredCount: Math.max(0, Number(row.deferredCount) || 0),
  }
}

export function normalizeFollowUps(raw: unknown): HostFollowUp[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => normalizeFollowUp(item as Partial<HostFollowUp>))
}

export function hostDisplayName(config: EventConfig): string {
  const hosts = config.invitation.design?.hosts?.trim() || config.invitation.hostLine?.trim()
  if (hosts) return hosts
  const family = config.basics.familyName?.trim()
  if (family) return family
  return config.basics.honoreeName?.trim() || 'Host'
}

export function selectFollowUpTargets(
  guests: Guest[],
  followUp: Pick<HostFollowUp, 'audience' | 'guestIds'>,
): Guest[] {
  const selected = followUp.guestIds?.length ? new Set(followUp.guestIds) : null
  return guests.filter((guest) => {
    if (guestMailRecipients(guest).length === 0) return false
    if (selected) return selected.has(guest.id)
    if (followUp.audience === 'all') return true
    return guest.status === followUp.audience
  })
}

export function followUpTargetsEmptyReason(
  guests: Guest[],
  followUp: Pick<HostFollowUp, 'audience' | 'guestIds'>,
): string {
  if (followUp.guestIds?.length) {
    const matched = guests.filter((guest) => followUp.guestIds.includes(guest.id))
    if (matched.length === 0) return 'Convidado não encontrado na seleção'
    if (matched.every((guest) => guestMailRecipients(guest).length === 0)) {
      return 'Este convidado não tem email'
    }
    return 'Nenhum convidado com email na seleção'
  }
  const withEmail = guests.filter((guest) => guestMailRecipients(guest).length > 0)
  if (withEmail.length === 0) return 'Nenhum convidado com email na seleção'
  if (followUp.audience !== 'all') {
    const matching = withEmail.filter((guest) => guest.status === followUp.audience)
    if (matching.length === 0) {
      return `Nenhum convidado com RSVP “${followUp.audience}” e email`
    }
  }
  return 'Nenhum convidado com email na seleção'
}

type FollowUpCopy = {
  subject: string
  headline: string
  viewMessage: string
  viewInvitation: string
  viewCard: string
  viewMessages: string
  calendar: string
  map: string
  greeting: (familyName: string) => string
  lookForward: string
}

const COPY: Record<EventLocale, FollowUpCopy> = {
  en: {
    subject: '',
    headline: '',
    viewMessage: 'View message',
    viewInvitation: 'View invitation',
    viewCard: 'VIEW CARD',
    viewMessages: 'View messages',
    calendar: 'ADD TO CALENDAR',
    map: 'VIEW LOCATION',
    greeting: (family) => (family ? `Hi ${family}!` : 'Hi Guests!'),
    lookForward: 'We look forward to seeing everyone!',
  },
  pt: {
    subject: '',
    headline: '',
    viewMessage: 'Ver mensagem',
    viewInvitation: 'Ver convite',
    viewCard: 'VER O CONVITE',
    viewMessages: 'Ver mensagens',
    calendar: 'ADICIONAR AO CALENDÁRIO',
    map: 'VER LOCAL',
    greeting: (family) => (family ? `Olá, ${family}!` : 'Olá, convidados!'),
    lookForward: 'Mal podemos esperar para ver todos!',
  },
  es: {
    subject: '',
    headline: '',
    viewMessage: 'Ver mensaje',
    viewInvitation: 'Ver invitación',
    viewCard: 'VER LA INVITACIÓN',
    viewMessages: 'Ver mensajes',
    calendar: 'AÑADIR AL CALENDARIO',
    map: 'VER UBICACIÓN',
    greeting: (family) => (family ? `¡Hola, ${family}!` : '¡Hola, invitados!'),
    lookForward: '¡Esperamos verlos a todos!',
  },
  he: {
    subject: '',
    headline: '',
    viewMessage: 'לצפייה בהודעה',
    viewInvitation: 'לצפייה בהזמנה',
    viewCard: 'לצפייה בכרטיס',
    viewMessages: 'לצפייה בהודעות',
    calendar: 'הוספה ליומן',
    map: 'צפייה במקום',
    greeting: (family) => (family ? `שלום ${family}!` : 'שלום אורחים!'),
    lookForward: 'מחכים לראות את כולם!',
  },
}

function typeSubject(
  type: HostFollowUpType,
  locale: EventLocale,
  eventTitle: string,
  hostName: string,
): string {
  if (type === 'reminder') {
    if (locale === 'pt') return `Lembrete — ${eventTitle}`
    if (locale === 'es') return `Recordatorio — ${eventTitle}`
    if (locale === 'he') return `תזכורת — ${eventTitle}`
    return `Reminder — ${eventTitle}`
  }
  if (type === 'update') {
    if (locale === 'pt') return `Atualização — ${eventTitle}`
    if (locale === 'es') return `Actualización — ${eventTitle}`
    if (locale === 'he') return `עדכון — ${eventTitle}`
    return `Update — ${eventTitle}`
  }
  if (locale === 'pt') return `${hostName} enviou uma mensagem`
  if (locale === 'es') return `${hostName} te envió un mensaje`
  if (locale === 'he') return `${hostName} שלח/ה לכם הודעה`
  return `${hostName} sent you a new message`
}

function typeHeadline(
  type: HostFollowUpType,
  locale: EventLocale,
  hostName: string,
): string {
  if (type === 'update') {
    if (locale === 'pt') return 'Houve uma atualização no evento'
    if (locale === 'es') return 'Hubo una actualización del evento'
    if (locale === 'he') return 'יש עדכון לאירוע'
    return 'There has been an update to the event'
  }
  if (type === 'message') {
    if (locale === 'pt') return `${hostName} enviou uma nova mensagem`
    if (locale === 'es') return `${hostName} te envió un mensaje nuevo`
    if (locale === 'he') return `${hostName} שלח/ה לכם הודעה חדשה`
    return `${hostName} sent you a new message`
  }
  if (locale === 'pt') return 'Lembrete do evento'
  if (locale === 'es') return 'Recordatorio del evento'
  if (locale === 'he') return 'תזכורת לאירוע'
  return 'Event reminder'
}

export function followUpCopy(locale: EventLocale): FollowUpCopy {
  return COPY[locale] || COPY.en
}

export function followUpSubject(
  type: HostFollowUpType,
  locale: EventLocale,
  eventTitle: string,
  hostName: string,
  custom?: string,
): string {
  if (custom?.trim()) return custom.trim()
  return typeSubject(type, locale, eventTitle, hostName)
}

export function followUpHeadline(
  type: HostFollowUpType,
  locale: EventLocale,
  hostName: string,
): string {
  return typeHeadline(type, locale, hostName)
}

export function previewMessage(body: string, max = 120): string {
  const text = body.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}
