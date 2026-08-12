import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { listEvents } from '@/lib/platform/store'
import { typeLabel } from '@/lib/platform/defaults'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const events = await listEvents()
  return (
    <DashboardShell>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Eventos</h1>
          <p className="mt-2 text-sm text-white/50">
            Crie um evento, customize no wizard com preview ao vivo e publique em /e/slug.
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
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/dashboard/events/${event.id}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-400/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-300/80">
                  {typeLabel(event.config.basics.type, event.config.locales.default)}
                </p>
                <h2 className="font-display mt-1 text-2xl">
                  {event.config.basics.honoreeName || 'Sem nome'}
                </h2>
                <p className="text-sm text-white/50">
                  Família {event.config.basics.familyName || '—'} · /e/{event.slug}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                  event.status === 'published'
                    ? 'bg-emerald-400/15 text-emerald-200'
                    : event.status === 'archived'
                      ? 'bg-white/10 text-white/40'
                      : 'bg-amber-400/15 text-amber-100'
                }`}
              >
                {event.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </DashboardShell>
  )
}
