import { notFound, redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { SectionEditor } from '@/components/dashboard/SectionEditor'
import { isSectionEditorId } from '@/lib/platform/section-editor'
import { getEvent } from '@/lib/platform/store'
import { assertEventPageAccess } from '@/lib/platform/session'

export const dynamic = 'force-dynamic'

export default async function EventSectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>
}) {
  const { id, section } = await params
  if (!isSectionEditorId(section)) notFound()
  await assertEventPageAccess(id)
  const event = await getEvent(id)
  if (!event) redirect('/dashboard?missing=1')

  return (
    <DashboardShell>
      <SectionEditor event={event} section={section} />
    </DashboardShell>
  )
}
