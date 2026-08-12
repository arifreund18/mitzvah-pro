import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { EventAdmin } from '@/components/dashboard/EventAdmin'
import { getEvent } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  return (
    <DashboardShell>
      <EventAdmin event={event} />
    </DashboardShell>
  )
}
