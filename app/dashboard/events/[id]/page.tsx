import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { EventActions } from '@/components/dashboard/EventActions'
import { getEvent } from '@/lib/platform/store'
import { typeLabel } from '@/lib/platform/defaults'
import { reviewIssues } from '@/lib/platform/wizard'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()
  const issues = reviewIssues(event.config)

  return (
    <DashboardShell>
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
        {typeLabel(event.config.basics.type)} · template BarBeni
      </p>
      <h1 className="font-display mt-2 text-4xl">{event.config.basics.honoreeName || 'Evento'}</h1>
      <p className="mt-2 text-white/50">
        Família {event.config.basics.familyName || '—'} · slug <code>/e/{event.slug}</code>
      </p>
      <div className="mt-8">
        <EventActions id={event.id} slug={event.slug} status={event.status} />
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase text-white/40">Status</p>
          <p className="mt-2 text-lg font-semibold">{event.status}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase text-white/40">Convidados</p>
          <p className="mt-2 text-lg font-semibold">{event.guests.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase text-white/40">Pendências do wizard</p>
          <p className="mt-2 text-lg font-semibold">{issues.length}</p>
        </div>
      </div>
    </DashboardShell>
  )
}
