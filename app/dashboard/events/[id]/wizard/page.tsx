import { WizardStudio } from '@/components/wizard/WizardStudio'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidSession, SESSION_COOKIE } from '@/lib/platform/auth'
import { getEvent } from '@/lib/platform/store'
import { assertEventPageAccess } from '@/lib/platform/session'

export const dynamic = 'force-dynamic'

export default async function WizardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const jar = await cookies()
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) {
    redirect('/dashboard/login')
  }
  const { id } = await params
  await assertEventPageAccess(id)
  const event = await getEvent(id)
  if (!event) redirect('/dashboard?missing=1')
  return <WizardStudio event={event} />
}
