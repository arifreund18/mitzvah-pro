import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { getEvent } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  return (
    <DashboardShell>
      <a href={`/dashboard/events/${event.id}`} className="text-sm text-white/40 hover:text-white">
        ← {event.config.basics.honoreeName}
      </a>
      <h1 className="font-display mt-3 text-3xl">Convidados</h1>
      <p className="mt-2 text-sm text-white/50">{event.guests.length} registros · RSVPs do site público entram aqui</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Família</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Pessoas</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Refeição</th>
            </tr>
          </thead>
          <tbody>
            {event.guests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  Nenhum convidado ainda.
                </td>
              </tr>
            ) : (
              event.guests.map((guest) => (
                <tr key={guest.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{guest.familyName}</td>
                  <td className="px-4 py-3 text-white/60">{guest.email || '—'}</td>
                  <td className="px-4 py-3">{guest.partySize}</td>
                  <td className="px-4 py-3">{guest.status}</td>
                  <td className="px-4 py-3 text-white/60">{guest.meal || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  )
}
