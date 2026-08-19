import { NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/platform/auth'
import { currentActor } from '@/lib/platform/session'
import { getOrg, getUser } from '@/lib/platform/store'

export async function GET() {
  const actor = await currentActor()
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const org = await getOrg(actor.orgId)
  const user =
    actor.kind === 'user' ? await getUser(actor.userId) : null
  return NextResponse.json({
    role: actor.role,
    orgId: actor.orgId,
    orgName: org?.name || actor.orgId,
    userId: actor.kind === 'user' ? actor.userId : null,
    email: user?.email || null,
    name: user?.name || (actor.kind === 'admin' ? 'Platform admin' : null),
    isPlatformAdmin: isPlatformAdmin(actor),
    canManageUsers: actor.role === 'platform_admin' || actor.role === 'org_owner',
  })
}
