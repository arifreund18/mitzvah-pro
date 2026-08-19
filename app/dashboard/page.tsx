import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { EventActions } from '@/components/dashboard/EventActions'
import { MissingEventNotice } from '@/components/dashboard/MissingEventNotice'
import { listEvents, getOrg } from '@/lib/platform/store'
import { typeLabel } from '@/lib/platform/defaults'
import { eventPublicHostLabel, hostFromHeaders } from '@/lib/platform/site-url'
import { actorOrgId, currentActor } from '@/lib/platform/session'
import { isPlatformAdmin } from '@/lib/platform/auth'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const actor = await currentActor()
  const orgId = actorOrgId(actor)
  const events = await listEvents(orgId)
  const org = actor ? await getOrg(actor.orgId) : null
  const host = hostFromHeaders(await headers())
  return (
    <DashboardShell>
      <Suspense fallback={null}>
        <MissingEventNotice />
      </Suspense>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Eventos</h1>
          <p className="mt-2 text-sm text-white/50">
            {isPlatformAdmin(actor)
              ? 'Visão global — todos os eventos de todas as organizações.'
              : `Eventos da organização ${org?.name || actor?.orgId}.`}
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#0b1020]"
        >
          Novo evento
        </Link>
      </div>
      <div className="mt-10 grid gap-4">
        {events.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            Nenhum evento. Crie o primeiro com “Novo evento”.
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
                    {event.config.basics.honoreeName || 'Sem nome'}
                  </h2>
                  <p className="text-sm text-white/50">
                    Família {event.config.basics.familyName || '—'} · {eventPublicHostLabel(event.slug, { host })}
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
                />
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  )
}
