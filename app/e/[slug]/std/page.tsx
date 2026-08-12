import { notFound } from 'next/navigation'
import { EmailChrome, SaveTheDateCard } from '@/components/template/EventEmails'
import { getEventBySlug } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export default async function SaveTheDatePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) notFound()

  return (
    <EmailChrome kind="std" config={event.config}>
      <SaveTheDateCard config={event.config} ctaHref={`/e/${event.slug}`} />
    </EmailChrome>
  )
}
