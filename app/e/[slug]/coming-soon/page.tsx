import { notFound } from 'next/navigation'
import { ComingSoon } from '@/components/template/ComingSoon'
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
  const enabled = event.config.locales.enabled
  const locale =
    lang && isEventLocale(lang) && enabled.includes(lang) ? lang : event.config.locales.default
  return <ComingSoon config={event.config} locale={locale} />
}
