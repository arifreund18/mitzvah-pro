import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { NextResponse } from 'next/server'
import { canActorAccessEvent } from '@/lib/platform/access'
import {
  canManageUsers,
  isPlatformAdmin,
  readSession,
  SESSION_COOKIE,
  type SessionActor,
} from '@/lib/platform/auth'
import { getEvent, getUser } from '@/lib/platform/store'

export async function currentActor(): Promise<SessionActor | null> {
  const jar = await cookies()
  const raw = readSession(jar.get(SESSION_COOKIE)?.value)
  if (!raw) return null
  // Admin cookie is not tied to a DB user.
  if (raw.kind === 'admin') return raw
  // C2: role/org always come from the store — deleted/demoted users lose access immediately.
  const user = await getUser(raw.userId)
  if (!user) return null
  return {
    kind: 'user',
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  }
}

export async function requireSession(): Promise<NextResponse | null> {
  const actor = await currentActor()
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  return null
}

export async function requireEventAccess(eventId: string): Promise<NextResponse | null> {
  const denied = await requireSession()
  if (denied) return denied
  const actor = await currentActor()
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (isPlatformAdmin(actor)) return null
  const event = await getEvent(eventId)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  const user = actor.kind === 'user' ? await getUser(actor.userId) : null
  if (!canActorAccessEvent(actor, event, user)) {
    return NextResponse.json({ error: 'Sem permissão neste evento' }, { status: 403 })
  }
  return null
}

export async function requireUserManagement(): Promise<NextResponse | null> {
  const denied = await requireSession()
  if (denied) return denied
  const actor = await currentActor()
  if (!canManageUsers(actor)) {
    return NextResponse.json({ error: 'Sem permissão para gerir utilizadores' }, { status: 403 })
  }
  return null
}

export function actorOrgId(actor: SessionActor | null): string | null {
  if (!actor || isPlatformAdmin(actor)) return null
  return actor.orgId
}

export async function assertEventPageAccess(eventId: string): Promise<void> {
  const denied = await requireEventAccess(eventId)
  if (denied) notFound()
}
