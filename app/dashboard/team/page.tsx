import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { TeamPanel } from '@/components/dashboard/TeamPanel'
import { canManageUsers } from '@/lib/platform/auth'
import { actorOrgId, currentActor } from '@/lib/platform/session'
import { listEvents, listUsers } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const actor = await currentActor()
  if (!actor) redirect('/dashboard/login')

  const orgId = actorOrgId(actor) || actor.orgId
  const users = canManageUsers(actor)
    ? (await listUsers(orgId)).map(({ passwordHash: _, ...user }) => user)
    : []
  const events = canManageUsers(actor)
    ? (await listEvents(orgId)).map((event) => ({
        id: event.id,
        slug: event.slug,
        name: event.config.basics.honoreeName || event.slug,
        familyName: event.config.basics.familyName || '',
      }))
    : []

  return (
    <DashboardShell>
      <div>
        <h1 className="font-display text-3xl">Equipa</h1>
        <p className="mt-2 text-sm text-white/50">
          Owners veem todos os eventos da org. Membros só veem os eventos que você atribuir.
        </p>
      </div>
      <div className="mt-10">
        <TeamPanel
          initialUsers={users}
          events={events}
          me={{
            userId: actor.kind === 'user' ? actor.userId : null,
            canManageUsers: canManageUsers(actor),
          }}
        />
      </div>
    </DashboardShell>
  )
}
