import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { SaveTheDateCard } from '@/components/template/EventEmails'
import { EnvelopeClient } from '@/lib/event-cards'
import { hostFromHeaders, eventPublicUrl } from '@/lib/platform/site-url'
import { getEventBySlug, markGuestOpened } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export default async function SaveTheDateTokenPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>
}) {
  const { slug, token } = await params
  const event = await getEventBySlug(slug)
  if (!event || (event.status !== 'published' && event.status !== 'approved')) notFound()
  const guest = event.guests.find((g) => g.token === token)
  if (!guest) notFound()

  await markGuestOpened(event.id, guest.id, 'std')

  const host = hostFromHeaders(await headers())
  const design = event.config.saveTheDate.design

  return (
    <EnvelopeClient
      config={{
        pageColor: design.pageColor,
        pageTexture: design.pageTexture,
        envelopeColor: design.envelopeColor,
        envelopeLiner: design.envelopeLiner,
        sealUrl: design.sealUrl || event.config.invitation.sealImageUrl,
        sealBg: design.sealBg,
        sealLabel: event.config.invitation.sealLabel,
        openLabel: event.config.saveTheDate.envelopeLabel || 'Open save the date',
      }}
    >
      <SaveTheDateCard
        config={event.config}
        ctaHref={eventPublicUrl(event.slug, '', { host })}
      />
    </EnvelopeClient>
  )
}
