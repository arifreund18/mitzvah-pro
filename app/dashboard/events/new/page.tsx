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
        Escolha se quer site completo ou só o convite, os idiomas, o nome e a família. No wizard você
        define em qual idioma vai preencher.
      </p>
      <NewEventForm />
    </DashboardShell>
  )
}
