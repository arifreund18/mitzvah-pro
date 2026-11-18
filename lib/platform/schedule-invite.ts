import type { Guest, ScheduleInviteMode } from './types'

export type GuestScheduleState = {
  mode: ScheduleInviteMode
  /** Only used when mode === 'subset' */
  itemIds: string[]
}

export function defaultScheduleState(): GuestScheduleState {
  return { mode: 'all', itemIds: [] }
}

export function guestScheduleState(
  guest: Pick<Guest, 'scheduleInviteMode' | 'scheduleItemIds'>,
): GuestScheduleState {
  return {
    mode: guest.scheduleInviteMode || 'all',
    itemIds: Array.isArray(guest.scheduleItemIds) ? guest.scheduleItemIds.map(String) : [],
  }
}

export function guestInvitedToScheduleItem(
  state: GuestScheduleState,
  itemId: string,
  allItemIds: string[],
): boolean {
  if (!allItemIds.includes(itemId)) return false
  if (state.mode === 'all') return true
  if (state.mode === 'none') return false
  return state.itemIds.includes(itemId)
}

export function setGuestScheduleInvitation(
  state: GuestScheduleState,
  itemId: string,
  allItemIds: string[],
  invited: boolean,
): GuestScheduleState {
  const allowed = new Set(allItemIds)
  const current = new Set(
    state.mode === 'all'
      ? allItemIds
      : state.mode === 'none'
        ? []
        : state.itemIds.filter((id) => allowed.has(id)),
  )

  if (invited) current.add(itemId)
  else current.delete(itemId)

  if (current.size === 0) return { mode: 'none', itemIds: [] }
  if (current.size >= allItemIds.length) return { mode: 'all', itemIds: [] }
  return { mode: 'subset', itemIds: [...current] }
}

export function scheduleStateFromSelection(
  selectedItemIds: string[],
  allItemIds: string[],
): GuestScheduleState {
  const ids = selectedItemIds.filter((id) => allItemIds.includes(id))
  if (ids.length === 0) return { mode: 'none', itemIds: [] }
  if (ids.length >= allItemIds.length) return { mode: 'all', itemIds: [] }
  return { mode: 'subset', itemIds: ids }
}

export function guestsInvitedToScheduleItem(
  guests: Array<Pick<Guest, 'id' | 'scheduleInviteMode' | 'scheduleItemIds'>>,
  itemId: string,
  allItemIds: string[],
): string[] {
  return guests
    .filter((guest) =>
      guestInvitedToScheduleItem(guestScheduleState(guest), itemId, allItemIds),
    )
    .map((guest) => guest.id)
}

/** Apply a full invited-guest set for one schedule item onto every guest. */
export function applyScheduleItemInvitations(
  guests: Guest[],
  itemId: string,
  allItemIds: string[],
  invitedGuestIds: string[],
): Guest[] {
  if (!allItemIds.includes(itemId)) return guests
  const invited = new Set(invitedGuestIds)
  return guests.map((guest) => {
    const next = setGuestScheduleInvitation(
      guestScheduleState(guest),
      itemId,
      allItemIds,
      invited.has(guest.id),
    )
    return {
      ...guest,
      scheduleInviteMode: next.mode,
      scheduleItemIds: next.itemIds,
    }
  })
}
