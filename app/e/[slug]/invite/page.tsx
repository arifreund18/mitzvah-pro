import { notFound } from 'next/navigation'
import { EmailChrome, InvitationCard } from '@/components/template/EventEmails'
import { getEventBySlug } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export default async function InvitationMailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) notFound()

  return (
    <EmailChrome kind="invite" config={event.config}>
      <InvitationCard config={event.config} ctaHref={`/e/${event.slug}#rsvp`} />
    </EmailChrome>
  )
}
