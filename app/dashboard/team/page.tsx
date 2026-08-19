import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { TeamPanel } from '@/components/dashboard/TeamPanel'
import { canManageUsers } from '@/lib/platform/auth'
import { actorOrgId, currentActor } from '@/lib/platform/session'
import { listUsers } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const actor = await currentActor()
  if (!actor) redirect('/dashboard/login')

  const orgId = actorOrgId(actor) || actor.orgId
  const users = canManageUsers(actor)
    ? (await listUsers(orgId)).map(({ passwordHash: _, ...user }) => user)
    : []

  return (
    <DashboardShell>
      <div>
        <h1 className="font-display text-3xl">Equipa</h1>
        <p className="mt-2 text-sm text-white/50">
          Convide membros da organização. Cada utilizador vê apenas os eventos da sua org.
        </p>
      </div>
      <div className="mt-10">
        <TeamPanel
          initialUsers={users}
          me={{
            userId: actor.kind === 'user' ? actor.userId : null,
            canManageUsers: canManageUsers(actor),
          }}
        />
      </div>
    </DashboardShell>
  )
}
