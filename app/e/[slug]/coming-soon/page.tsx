import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { THEME_PRESETS } from '@/components/template/EventSite'
import { isEventLocale } from '@/lib/platform/locales'
import { getEventBySlug } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

const DEFAULT_MESSAGE =
  'Em breve. Estamos a preparar o site deste evento — volte em breve para detalhes e RSVP.'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return { title: 'Coming soon' }
  const name = event.config.basics.honoreeName || event.slug
  return { title: `${name} — Coming soon` }
}

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

  const overlay = event.config.contentI18n?.[locale]?.legal?.comingSoonMessage
  const fromLegal =
    'comingSoonMessage' in event.config.legal
      ? String((event.config.legal as { comingSoonMessage?: string }).comingSoonMessage || '')
      : ''
  const message = overlay?.trim() || fromLegal.trim() || DEFAULT_MESSAGE

  const theme = THEME_PRESETS[event.config.branding.theme]
  const title =
    event.config.story.headline ||
    event.config.basics.honoreeName ||
    'Coming soon'

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center"
      style={{ background: theme.bg, color: theme.text }}
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <p className="text-xs uppercase tracking-[0.3em] opacity-60">Coming soon</p>
      <h1 className="font-display mt-4 max-w-2xl text-4xl md:text-5xl">{title}</h1>
      <p className="mt-6 max-w-xl text-base opacity-80 md:text-lg">{message}</p>
    </main>
  )
}
