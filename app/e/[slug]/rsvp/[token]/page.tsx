import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { TokenRsvpForm } from '@/components/template/TokenRsvpForm'
import { resolveGuestLocale } from '@/lib/platform/guest-locale'
import { rsvpSiteHomeHref } from '@/lib/platform/rsvp-site-home'
import { hostFromHeaders } from '@/lib/platform/site-url'
import { getFamilyByToken, getEventBySlug } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export default async function TokenRsvpPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>
}) {
  const { slug, token } = await params
  const event = await getEventBySlug(slug)
  if (!event || event.status === 'archived') notFound()

  const found = await getFamilyByToken(token)
  if (!found || found.event.id !== event.id) notFound()

  const locale = resolveGuestLocale(found.guest, event.config)
  const accent = event.config.branding.accentColor || '#22d3ee'
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const host = hostFromHeaders(await headers())
  const siteHomeHref = rsvpSiteHomeHref(event.config, event.slug, {
    host,
    guestToken: token,
    locale,
  })

  return (
    <div className="min-h-full bg-[#0b1020] px-4 py-12 text-white" dir={dir}>
      <div className="mx-auto max-w-xl">
        <p className="text-center text-xs uppercase tracking-[0.35em] opacity-50">
          {event.config.story.headline || event.config.basics.honoreeName}
        </p>
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <TokenRsvpForm
            token={token}
            guest={found.guest}
            rsvp={event.config.rsvp}
            locale={locale}
            accent={accent}
            siteHomeHref={siteHomeHref}
          />
        </div>
      </div>
    </div>
  )
}
