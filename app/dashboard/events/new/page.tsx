import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { NewEventForm } from '@/components/dashboard/NewEventForm'
import { actorSeesAllOrgEvents } from '@/lib/platform/access'
import { currentActor } from '@/lib/platform/session'
import { resolveStudioLocale, STUDIO_LOCALE_COOKIE } from '@/lib/platform/studio-locale'
import { studioUi } from '@/lib/platform/studio-ui'

export default async function NewEventPage() {
  const actor = await currentActor()
  if (!actorSeesAllOrgEvents(actor)) redirect('/dashboard')
  const jar = await cookies()
  const hdrs = await headers()
  const locale = resolveStudioLocale({
    cookie: jar.get(STUDIO_LOCALE_COOKIE)?.value,
    acceptLanguage: hdrs.get('accept-language'),
  })
  const ui = studioUi(locale)

  return (
    <DashboardShell locale={locale}>
      <h1 className="font-display text-3xl">{ui.newEvent}</h1>
      <p className="mt-2 mb-8 max-w-xl text-sm text-white/50">{ui.createHint}</p>
      <NewEventForm locale={locale} />
    </DashboardShell>
  )
}
