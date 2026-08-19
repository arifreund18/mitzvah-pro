import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/dashboard/LogoutButton'
import { StorageAlert } from '@/components/dashboard/StorageAlert'
import { canManageUsers, readSession, SESSION_COOKIE } from '@/lib/platform/auth'
import { getOrg } from '@/lib/platform/store'

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const jar = await cookies()
  const actor = readSession(jar.get(SESSION_COOKIE)?.value)
  if (!actor) redirect('/dashboard/login')

  const org = await getOrg(actor.orgId)
  const orgLabel = org?.name || actor.orgId
  const showTeam = canManageUsers(actor)
  const actorLabel =
    actor.kind === 'admin'
      ? 'Platform admin'
      : actor.role === 'org_owner'
        ? 'Owner'
        : 'Membro'

  return (
    <div className="min-h-screen bg-[#070b16] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/dashboard" className="font-display text-lg">
              Mitzvah<span className="text-cyan-400">.pro</span> Studio
            </Link>
            <p className="mt-0.5 text-xs text-white/40">
              {orgLabel} · {actorLabel}
            </p>
          </div>
          <nav className="flex items-center gap-4 text-sm text-white/60">
            <Link href="/dashboard" className="hover:text-white">
              Eventos
            </Link>
            {showTeam ? (
              <Link href="/dashboard/team" className="hover:text-white">
                Equipa
              </Link>
            ) : null}
            <Link href="/" className="hover:text-white">
              Landing
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <StorageAlert />
        {children}
      </main>
    </div>
  )
}
