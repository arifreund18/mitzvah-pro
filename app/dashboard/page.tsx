import { cookies, headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'
import { DashboardShell, dashboardSubtitle } from '@/components/dashboard/DashboardShell'
import { EventActions } from '@/components/dashboard/EventActions'
import { MissingEventNotice } from '@/components/dashboard/MissingEventNotice'
import { actorAllowedEventIds, actorSeesAllOrgEvents } from '@/lib/platform/access'
import { listEvents, getOrg, getUser } from '@/lib/platform/store'
import { typeLabel } from '@/lib/platform/defaults'
import { eventPublicHostLabel, hostFromHeaders } from '@/lib/platform/site-url'
import { actorOrgId, currentActor } from '@/lib/platform/session'
import { canManageEventOptions, isPlatformAdmin } from '@/lib/platform/auth'
import { resolveStudioLocale, STUDIO_LOCALE_COOKIE } from '@/lib/platform/studio-locale'
import { studioUi } from '@/lib/platform/studio-ui'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const actor = await currentActor()
  const orgId = actorOrgId(actor)
  const user = actor?.kind === 'user' ? await getUser(actor.userId) : null
  const scoped = !actorSeesAllOrgEvents(actor)
  const eventIds = scoped ? actorAllowedEventIds(actor, user) : null
  const events = await listEvents(orgId, eventIds)
  const org = actor ? await getOrg(actor.orgId) : null
  const host = hostFromHeaders(await headers())
  const canCreate = actorSeesAllOrgEvents(actor)
  const jar = await cookies()
  const hdrs = await headers()
  const locale = resolveStudioLocale({
    cookie: jar.get(STUDIO_LOCALE_COOKIE)?.value,
    acceptLanguage: hdrs.get('accept-language'),
  })
  const ui = studioUi(locale)
  return (
    <DashboardShell locale={locale}>
      <Suspense fallback={null}>
        <MissingEventNotice />
      </Suspense>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{ui.eventsTitle}</h1>
          <p className="mt-2 text-sm text-white/50">
            {dashboardSubtitle(ui, {
              all: isPlatformAdmin(actor),
              scoped,
              org: org?.name || actor?.orgId,
            })}
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/dashboard/events/new"
            className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#0b1020]"
          >
            {ui.newEvent}
          </Link>
        ) : null}
      </div>
      <div className="mt-10 grid gap-4">
        {events.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            {scoped ? ui.noEventsScoped : ui.noEvents}
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-400/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <Link href={`/dashboard/events/${event.id}`} className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-widest text-cyan-300/80">
                    {typeLabel(event.config.basics.type, event.config.locales.default)}
                  </p>
                  <h2 className="font-display mt-1 text-2xl">
                    {event.config.basics.honoreeName || ui.unnamed}
                  </h2>
                  <p className="text-sm text-white/50">
                    {ui.familyPrefix} {event.config.basics.familyName || '—'} ·{' '}
                    {eventPublicHostLabel(event.slug, { host })}
                  </p>
                </Link>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    event.status === 'published'
                      ? 'bg-emerald-400/15 text-emerald-200'
                      : event.status === 'archived'
                        ? 'bg-white/10 text-white/40'
                        : event.status === 'approved'
                          ? 'bg-cyan-400/15 text-cyan-100'
                          : event.status === 'pending_review'
                            ? 'bg-violet-400/15 text-violet-100'
                            : 'bg-amber-400/15 text-amber-100'
                  }`}
                >
                  {event.status}
                </span>
              </div>
              <div className="mt-4">
                <EventActions
                  id={event.id}
                  slug={event.slug}
                  status={event.status}
                  previewToken={event.previewToken}
                  compact
                  locale={locale}
                  canHardDelete={canManageEventOptions(actor)}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  )
}
