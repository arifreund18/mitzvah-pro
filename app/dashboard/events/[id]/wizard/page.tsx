import { notFound } from 'next/navigation'
import { WizardStudio } from '@/components/wizard/WizardStudio'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidSession, SESSION_COOKIE } from '@/lib/platform/auth'
import { getEvent } from '@/lib/platform/store'

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
  const event = await getEvent(id)
  if (!event) notFound()
  return <WizardStudio event={event} />
}
