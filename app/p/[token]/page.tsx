import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EventSite } from '@/components/template/EventSite'
import { getEventByPreviewToken } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const event = await getEventByPreviewToken(token)
  if (!event) return { title: 'Preview' }
  return {
    title: `Preview · ${event.config.domain.seoTitle || event.config.basics.honoreeName}`,
    robots: { index: false, follow: false },
  }
}

export default async function PreviewDraftPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const event = await getEventByPreviewToken(token)
  if (!event || event.status === 'archived') notFound()
  const locale = event.config.locales.default

  return (
    <div className="bg-[#0b1020] text-white">
      <div className="bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-[#0b1020]">
        Preview do rascunho — ainda não está publicado
      </div>
      <EventSite config={event.config} mode="preview" displayLocale={locale} slug={event.slug} />
    </div>
  )
}
