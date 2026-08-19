import { NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/platform/auth'
import { actorOrgId, currentActor, requireUserManagement } from '@/lib/platform/session'
import { createUser, listUsers } from '@/lib/platform/store'
import type { UserRole } from '@/lib/platform/types'

export async function GET() {
  const denied = await requireUserManagement()
  if (denied) return denied
  const actor = await currentActor()
  const orgId = actorOrgId(actor) || actor!.orgId
  const users = await listUsers(orgId)
  return NextResponse.json({
    users: users.map(({ passwordHash: _, ...user }) => user),
  })
}

export async function POST(request: Request) {
  const denied = await requireUserManagement()
  if (denied) return denied
  const actor = await currentActor()
  const body = (await request.json().catch(() => null)) as {
    email?: string
    name?: string
    password?: string
    role?: UserRole
    orgId?: string
  } | null
  const email = body?.email?.trim()
  const name = body?.name?.trim()
  const password = body?.password || ''
  if (!email || !name || password.length < 6) {
    return NextResponse.json({ error: 'Email, nome e senha (6+) são obrigatórios' }, { status: 400 })
  }
  const role = body?.role === 'org_member' ? 'org_member' : 'org_owner'
  const orgId = isPlatformAdmin(actor) && body?.orgId ? body.orgId : actor!.orgId
  try {
    const user = await createUser({ email, name, password, role, orgId })
    const { passwordHash: _, ...safe } = user
    return NextResponse.json({ user: safe })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível criar' },
      { status: 400 },
    )
  }
}
