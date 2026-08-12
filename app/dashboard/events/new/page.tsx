import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { NewEventForm } from '@/components/dashboard/NewEventForm'

export default function NewEventPage() {
  return (
    <DashboardShell>
      <h1 className="font-display text-3xl">Novo evento</h1>
      <p className="mt-2 mb-8 max-w-xl text-sm text-white/50">
        Escolha os idiomas do site, o nome e a família. No wizard você define em qual idioma vai preencher.
      </p>
      <NewEventForm />
    </DashboardShell>
  )
}
