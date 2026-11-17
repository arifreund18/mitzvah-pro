import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { SaveTheDateCard } from '@/components/template/EventEmails'
import { EnvelopeClient } from '@/lib/event-cards'
import { localizedOpenLabel, resolveGuestLocale } from '@/lib/platform/guest-locale'
import { openEnvelopeLabel } from '@/lib/platform/guest-ui'
import { getLocalizedCardDesign } from '@/lib/platform/i18n-content'
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
  if (!event || event.status === 'archived') notFound()
  const guest = event.guests.find((g) => g.token === token)
  if (!guest) notFound()

  await markGuestOpened(event.id, guest.id, 'std')

  const host = hostFromHeaders(await headers())
  const locale = resolveGuestLocale(guest, event.config)
  const design = getLocalizedCardDesign(event.config, locale, 'std')

  return (
    <EnvelopeClient
      config={{
        ...design,
        sealUrl: design.sealUrl || event.config.invitation.sealImageUrl,
        sealLabel: design.sealLabel || event.config.invitation.sealLabel,
        openLabel: localizedOpenLabel(
          event.config,
          locale,
          'std',
          openEnvelopeLabel('std', locale),
        ),
      }}
    >
      <SaveTheDateCard
        config={event.config}
        design={design}
        locale={locale}
        ctaHref={eventPublicUrl(event.slug, '', { host })}
      />
    </EnvelopeClient>
  )
}
