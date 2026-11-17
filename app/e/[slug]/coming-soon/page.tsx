import { notFound } from 'next/navigation'
import { ComingSoon } from '@/components/template/ComingSoon'
import { resolveGuestLocale } from '@/lib/platform/guest-locale'
import { isEventLocale } from '@/lib/platform/locales'
import { getEventBySlug } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export default async function ComingSoonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { slug } = await params
  const { lang } = await searchParams
  const event = await getEventBySlug(slug)
  if (!event || event.status !== 'published') notFound()
  const explicit = lang && isEventLocale(lang) ? lang : null
  const locale = resolveGuestLocale(null, event.config, explicit)
  return <ComingSoon config={event.config} locale={locale} />
}
