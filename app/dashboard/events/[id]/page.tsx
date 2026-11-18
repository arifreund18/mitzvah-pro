import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { EventAdmin } from '@/components/dashboard/EventAdmin'
import { canManageEventOptions } from '@/lib/platform/auth'
import { getEvent } from '@/lib/platform/store'
import { assertEventPageAccess, currentActor } from '@/lib/platform/session'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await assertEventPageAccess(id)
  const event = await getEvent(id)
  if (!event) redirect('/dashboard?missing=1')
  const actor = await currentActor()
  const locale = event.config.locales.default

  return (
    <DashboardShell locale={locale} lockLocale>
      <EventAdmin event={event} canManageOptions={canManageEventOptions(actor)} />
    </DashboardShell>
  )
}
