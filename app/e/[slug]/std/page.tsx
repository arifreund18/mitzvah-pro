import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { EmailChrome, SaveTheDateCard } from '@/components/template/EventEmails'
import { hostFromHeaders, eventPublicUrl } from '@/lib/platform/site-url'
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
  const host = hostFromHeaders(await headers())

  return (
    <EmailChrome kind="std" config={event.config}>
      <SaveTheDateCard config={event.config} ctaHref={eventPublicUrl(event.slug, '', { host })} />
    </EmailChrome>
  )
}
