import { notFound } from 'next/navigation'
import { InvitationCard } from '@/components/template/EventEmails'
import { EnvelopeClient } from '@/lib/event-cards'
import { getEventBySlug, markGuestOpened } from '@/lib/platform/store'
import { eventPublicUrl } from '@/lib/platform/site-url'
import { headers } from 'next/headers'
import { hostFromHeaders } from '@/lib/platform/site-url'

export const dynamic = 'force-dynamic'

export default async function InvitationCardTokenPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>
}) {
  const { slug, token } = await params
  const event = await getEventBySlug(slug)
  if (!event || (event.status !== 'published' && event.status !== 'approved')) notFound()
  const guest = event.guests.find((g) => g.token === token)
  if (!guest) notFound()

  await markGuestOpened(event.id, guest.id, 'invite')

  const host = hostFromHeaders(await headers())
  const design = event.config.invitation.design
  const sealUrl = design.sealUrl || event.config.invitation.sealImageUrl

  return (
    <EnvelopeClient
      config={{
        pageColor: design.pageColor,
        pageTexture: design.pageTexture,
        envelopeColor: design.envelopeColor,
        envelopeLiner: design.envelopeLiner,
        sealUrl,
        sealBg: design.sealBg,
        sealLabel: event.config.invitation.sealLabel,
        openLabel: 'Open invitation',
      }}
    >
      <InvitationCard
        config={event.config}
        ctaHref={eventPublicUrl(event.slug, `?guest=${guest.token}#rsvp`, { host })}
      />
    </EnvelopeClient>
  )
}
