import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { EventSite } from '@/components/template/EventSite'
import { EventRsvpForm } from '@/components/template/EventRsvpForm'
import { TokenRsvpForm } from '@/components/template/TokenRsvpForm'
import { resolveGuestLocale } from '@/lib/platform/guest-locale'
import { isEventLocale } from '@/lib/platform/locales'
import { rsvpSiteHomeHref } from '@/lib/platform/rsvp-site-home'
import { eventPublicUrl, hostFromHeaders } from '@/lib/platform/site-url'
import { getEventBySlug } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event || event.status !== 'published') return { title: 'Evento' }
  const host = hostFromHeaders(await headers())
  const url = eventPublicUrl(slug, '', { host })
  return {
    title: event.config.domain.seoTitle || event.config.basics.honoreeName,
    description: event.config.domain.seoDescription,
    alternates: { canonical: url },
  }
}

export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string; guest?: string; token?: string }>
}) {
  const { slug } = await params
  const { lang, guest: guestParam, token } = await searchParams
  const guestToken = guestParam || token
  const event = await getEventBySlug(slug)
  if (!event || event.status !== 'published') notFound()
  const guest = guestToken
    ? event.guests.find((item) => item.token === guestToken) || null
    : null
  const explicitLang = lang && isEventLocale(lang) ? lang : null
  const resolvedLocale = resolveGuestLocale(guest, event.config, explicitLang)
  const showPublicForm = !guest && event.config.rsvp.publicFormEnabled
  const accent = event.config.branding.accentColor || '#22d3ee'
  const host = hostFromHeaders(await headers())
  const siteHomeHref = rsvpSiteHomeHref(event.config, event.slug, {
    host,
    guestToken: guest?.token,
    locale: guest ? resolvedLocale : null,
  })

  return (
    <div className="bg-[#0b1020] text-white">
      <EventSite
        config={event.config}
        mode="live"
        displayLocale={resolvedLocale}
        slug={event.slug}
        eventId={event.id}
        guestToken={guestToken}
        guest={guest}
      />
      {guest ? (
        <section id="rsvp-form" className="mx-auto max-w-xl px-6 pb-24">
          <TokenRsvpForm
            token={guest.token}
            guest={guest}
            rsvp={event.config.rsvp}
            locale={resolvedLocale}
            accent={accent}
            siteHomeHref={siteHomeHref}
          />
        </section>
      ) : showPublicForm ? (
        <section className="mx-auto max-w-xl px-6 pb-24">
          <EventRsvpForm event={event} locale={resolvedLocale} siteHomeHref={siteHomeHref} />
        </section>
      ) : null}
    </div>
  )
}
