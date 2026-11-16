import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { NewEventForm } from '@/components/dashboard/NewEventForm'
import { actorSeesAllOrgEvents } from '@/lib/platform/access'
import { currentActor } from '@/lib/platform/session'

export default async function NewEventPage() {
  const actor = await currentActor()
  if (!actorSeesAllOrgEvents(actor)) redirect('/dashboard')

  return (
    <DashboardShell>
      <h1 className="font-display text-3xl">Novo evento</h1>
      <p className="mt-2 mb-8 max-w-xl text-sm text-white/50">
        Escolha Site, Convite e/ou Save the Date, os idiomas, o nome e a família. Pode alterar estas
        opções depois no wizard ou no painel do evento.
      </p>
      <NewEventForm />
    </DashboardShell>
  )
}
