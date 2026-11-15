import type { SessionActor } from './auth'
import type { PlatformEvent, PlatformUser, UserRole } from './types'

/** Owners/admins see every event in scope; members only the assigned ones. */
export function isEventScopedRole(role: UserRole | undefined | null): boolean {
  return role === 'org_member'
}

export function normalizeEventIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((id) => String(id || '').trim()).filter(Boolean))]
}

export function userEventIds(user: Pick<PlatformUser, 'role' | 'eventIds'> | null | undefined): string[] | null {
  if (!user) return null
  if (!isEventScopedRole(user.role)) return null
  return normalizeEventIds(user.eventIds)
}

export function actorSeesAllOrgEvents(actor: SessionActor | null): boolean {
  if (!actor) return false
  if (actor.role === 'platform_admin') return true
  return !isEventScopedRole(actor.role)
}

export function actorAllowedEventIds(actor: SessionActor | null, user: PlatformUser | null): string[] | null {
  if (!actor) return []
  if (actorSeesAllOrgEvents(actor)) return null
  if (actor.kind !== 'user') return []
  if (user && user.id === actor.userId) return userEventIds(user) || []
  return normalizeEventIds(user?.eventIds)
}

export function canActorAccessEvent(
  actor: SessionActor | null,
  event: Pick<PlatformEvent, 'id' | 'orgId'>,
  user: PlatformUser | null,
): boolean {
  if (!actor) return false
  if (actor.role === 'platform_admin') return true
  if (event.orgId !== actor.orgId) return false
  if (actorSeesAllOrgEvents(actor)) return true
  const allowed = actorAllowedEventIds(actor, user)
  if (allowed === null) return true
  return allowed.includes(event.id)
}

export function filterEventsForActor(
  events: PlatformEvent[],
  actor: SessionActor | null,
  user: PlatformUser | null,
): PlatformEvent[] {
  if (!actor) return []
  if (actorSeesAllOrgEvents(actor)) {
    if (actor.role === 'platform_admin') return events
    return events.filter((event) => event.orgId === actor.orgId)
  }
  const allowed = new Set(actorAllowedEventIds(actor, user) || [])
  return events.filter((event) => event.orgId === actor.orgId && allowed.has(event.id))
}
