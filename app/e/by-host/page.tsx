import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { EventSite } from '@/components/template/EventSite'
import { EventRsvpForm } from '@/components/template/EventRsvpForm'
import { getEventByCustomHost } from '@/lib/platform/store'
import { isEventLocale } from '@/lib/platform/locales'

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
  const enabled = event.config.locales.enabled
  const displayLocale =
    lang && isEventLocale(lang) && enabled.includes(lang) ? lang : event.config.locales.default
  return (
    <div className="bg-[#0b1020] text-white">
      <EventSite config={event.config} mode="live" displayLocale={displayLocale} slug={event.slug} />
      <section className="mx-auto max-w-xl px-6 pb-24">
        <EventRsvpForm event={event} />
      </section>
    </div>
  )
}
