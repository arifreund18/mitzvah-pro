import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EventSite } from '@/components/template/EventSite'
import { EventRsvpForm } from '@/components/template/EventRsvpForm'
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
  return {
    title: event.config.domain.seoTitle || event.config.basics.honoreeName,
    description: event.config.domain.seoDescription,
  }
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event || event.status !== 'published') notFound()

  return (
    <div className="bg-[#0b1020] text-white">
      <EventSite config={event.config} mode="live" />
      <section className="mx-auto max-w-xl px-6 pb-24">
        <EventRsvpForm event={event} />
      </section>
    </div>
  )
}
