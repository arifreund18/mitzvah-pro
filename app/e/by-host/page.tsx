import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { EventSite } from '@/components/template/EventSite'
import { EventRsvpForm } from '@/components/template/EventRsvpForm'
import { resolveGuestLocale } from '@/lib/platform/guest-locale'
import { isEventLocale } from '@/lib/platform/locales'
import { getEventByCustomHost } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export default async function CustomHostEventPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const host = (await headers()).get('x-forwarded-host') || (await headers()).get('host') || ''
  const event = await getEventByCustomHost(host)
  if (!event || event.status !== 'published') notFound()
  const { lang } = await searchParams
  const explicit = lang && isEventLocale(lang) ? lang : null
  const displayLocale = resolveGuestLocale(null, event.config, explicit)
  const showPublicForm = event.config.rsvp.publicFormEnabled
  return (
    <div className="bg-[#0b1020] text-white">
      <EventSite
        config={event.config}
        mode="live"
        displayLocale={displayLocale}
        slug={event.slug}
        eventId={event.id}
      />
      {showPublicForm ? (
        <section id="rsvp-form" className="mx-auto max-w-xl px-6 pb-24">
          <EventRsvpForm event={event} locale={displayLocale} />
        </section>
      ) : null}
    </div>
  )
}
