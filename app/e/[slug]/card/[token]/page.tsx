import { notFound } from 'next/navigation'
import { InvitationCard } from '@/components/template/EventEmails'
import { EnvelopeClient } from '@/lib/event-cards'
import { openEnvelopeLabel } from '@/lib/platform/guest-ui'
import { getLocalizedCardDesign } from '@/lib/platform/i18n-content'
import { getEventBySlug, markGuestOpened } from '@/lib/platform/store'
import { eventPublicUrl, hostFromHeaders } from '@/lib/platform/site-url'
import { headers } from 'next/headers'

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
  const locale = guest.inviteLocale || event.config.locales.default
  const design = getLocalizedCardDesign(event.config, locale, 'invite')
  const sealUrl = design.sealUrl || event.config.invitation.sealImageUrl

  return (
    <EnvelopeClient
      config={{
        ...design,
        sealUrl,
        sealLabel: design.sealLabel || event.config.invitation.sealLabel,
        openLabel: openEnvelopeLabel('invite', locale, design.openLabel),
      }}
    >
      <InvitationCard
        config={event.config}
        design={design}
        locale={locale}
        guestName={guest.familyName}
        ctaHref={eventPublicUrl(event.slug, `?guest=${guest.token}#rsvp`, { host })}
      />
    </EnvelopeClient>
  )
}
