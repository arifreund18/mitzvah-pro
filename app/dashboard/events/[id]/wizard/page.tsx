import { WizardStudio } from '@/components/wizard/WizardStudio'
import { redirect } from 'next/navigation'
import { getEvent } from '@/lib/platform/store'
import { assertEventPageAccess, currentActor } from '@/lib/platform/session'

export const dynamic = 'force-dynamic'

export default async function WizardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!(await currentActor())) {
    redirect('/dashboard/login')
  }
  const { id } = await params
  await assertEventPageAccess(id)
  const event = await getEvent(id)
  if (!event) redirect('/dashboard?missing=1')
  return <WizardStudio event={event} />
}
