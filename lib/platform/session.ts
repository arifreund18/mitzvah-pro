import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { NextResponse } from 'next/server'
import {
  canManageUsers,
  isPlatformAdmin,
  readSession,
  SESSION_COOKIE,
  type SessionActor,
} from '@/lib/platform/auth'
import { getEvent } from '@/lib/platform/store'

export async function currentActor(): Promise<SessionActor | null> {
  const jar = await cookies()
  return readSession(jar.get(SESSION_COOKIE)?.value)
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
  if (!actor || isPlatformAdmin(actor)) return null
  const event = await getEvent(eventId)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  if (event.orgId !== actor.orgId) {
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
