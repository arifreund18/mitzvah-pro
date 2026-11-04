import type { Guest, ScheduleItem } from './types'

/** Filter schedule items the way BarBeni does per family invite mode. */
export function scheduleItemsForGuest(
  items: ScheduleItem[],
  guest: Guest | null | undefined,
  mode: 'live' | 'preview' = 'live',
): ScheduleItem[] {
  const base = items.filter((item) => {
    if (mode === 'preview') return true
    if (item.visibility === 'invite' && !guest) return false
    return true
  })

  if (!guest) return base

  if (guest.scheduleInviteMode === 'none') return []
  if (guest.scheduleInviteMode === 'subset') {
    const allowed = new Set(guest.scheduleItemIds || [])
    if (!allowed.size) return []
    return base.filter((item) => allowed.has(item.id))
  }
  // 'all' — still respect visibility=invite when no guest token (handled above)
  return base
}
