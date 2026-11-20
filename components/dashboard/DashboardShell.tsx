import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/dashboard/LogoutButton'
import { StorageAlert } from '@/components/dashboard/StorageAlert'
import { StudioLocaleSwitcher } from '@/components/dashboard/StudioLocaleSwitcher'
import { canManageUsers } from '@/lib/platform/auth'
import { currentActor } from '@/lib/platform/session'
import { resolveStudioLocale, STUDIO_LOCALE_COOKIE } from '@/lib/platform/studio-locale'
import { fillTemplate, studioUi } from '@/lib/platform/studio-ui'
import { getOrg } from '@/lib/platform/store'
import type { EventLocale } from '@/lib/platform/types'

export async function DashboardShell({
  children,
  locale: localeProp,
  lockLocale = false,
}: {
  children: React.ReactNode
  /** Preferred studio language (event default or resolved cookie). */
  locale?: EventLocale
  /** When true (event pages), hide the studio language switcher. */
  lockLocale?: boolean
}) {
  const jar = await cookies()
  const actor = await currentActor()
  if (!actor) redirect('/dashboard/login')

  const hdrs = await headers()
  const locale =
    localeProp ||
    resolveStudioLocale({
      cookie: jar.get(STUDIO_LOCALE_COOKIE)?.value,
      acceptLanguage: hdrs.get('accept-language'),
    })
  const ui = studioUi(locale)

  const org = await getOrg(actor.orgId)
  const orgLabel = org?.name || actor.orgId
  const showTeam = canManageUsers(actor)
  const actorLabel =
    actor.kind === 'admin'
      ? ui.platformAdmin
      : actor.role === 'org_owner'
        ? ui.owner
        : ui.member

  return (
    <div className="min-h-screen bg-[#070b16] text-white" lang={locale}>
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
            {!lockLocale ? (
              <StudioLocaleSwitcher locale={locale} label={ui.studioLanguage} />
            ) : null}
            <Link href="/dashboard" className="hover:text-white">
              {ui.events}
            </Link>
            {showTeam ? (
              <Link href="/dashboard/team" className="hover:text-white">
                {ui.team}
              </Link>
            ) : null}
            <Link href="/" className="hover:text-white">
              {ui.landing}
            </Link>
            <LogoutButton label={ui.logout} />
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

export function dashboardSubtitle(
  ui: ReturnType<typeof studioUi>,
  opts: { all?: boolean; scoped?: boolean; org?: string },
): string {
  if (opts.all) return ui.eventsSubtitleAll
  if (opts.scoped) return ui.eventsSubtitleScoped
  return fillTemplate(ui.eventsSubtitleOrg, { org: opts.org || '—' })
}
