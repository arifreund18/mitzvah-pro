import { guestMailRecipients } from './family-emails.ts'
import type { Guest } from './types.ts'

/**
 * Idempotency for /send/process: skip SES only when *this job* already marked
 * the guest (crash / lease reclaim after a successful send).
 *
 * A prior campaign's `stdSentAt` / `inviteSentAt` (before `job.createdAt`) must
 * still send — that is the intentional per-family re-send path from the admin UI.
 */
export function shouldSkipAlreadySent(
  sentAt: string | null | undefined,
  jobCreatedAt: string,
): boolean {
  if (!sentAt) return false
  return sentAt >= jobCreatedAt
}

/**
 * Guests eligible for a mail send.
 * - With `guestIds`: those ids that have email (allows re-send).
 * - Without: everyone with email who has not yet received this kind.
 */
export function selectMailTargets(
  guests: Guest[],
  kind: 'std' | 'invite',
  guestIds?: string[] | null,
): Guest[] {
  const selected = guestIds?.length ? new Set(guestIds) : null
  return guests.filter((guest) => {
    if (guestMailRecipients(guest).length === 0) return false
    if (selected) return selected.has(guest.id)
    if (kind === 'std') return !guest.stdSentAt
    return !guest.inviteSentAt
  })
}

export function mailTargetsEmptyReason(
  guests: Guest[],
  kind: 'std' | 'invite',
  guestIds?: string[] | null,
): string {
  if (guestIds?.length) {
    const matched = guests.filter((guest) => guestIds.includes(guest.id))
    if (matched.length === 0) return 'Convidado não encontrado na seleção'
    if (matched.every((guest) => guestMailRecipients(guest).length === 0)) {
      return 'Este convidado não tem email'
    }
    return 'Nenhum convidado com email na seleção'
  }
  const withEmail = guests.filter((guest) => guestMailRecipients(guest).length > 0)
  if (withEmail.length === 0) return 'Nenhum convidado com email na seleção'
  const pending = withEmail.filter((guest) =>
    kind === 'std' ? !guest.stdSentAt : !guest.inviteSentAt,
  )
  if (pending.length === 0) {
    return kind === 'std'
      ? 'Todos os convidados com email já receberam o Save the Date'
      : 'Todos os convidados com email já receberam o convite'
  }
  return 'Nenhum convidado com email na seleção'
}
