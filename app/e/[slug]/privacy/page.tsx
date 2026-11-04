import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/platform/store'
import { THEME_PRESETS } from '@/components/template/EventSite'

export const dynamic = 'force-dynamic'

function sanitize(html: string): string {
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
}

export default async function PrivacyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event || event.status !== 'published') notFound()
  const theme = THEME_PRESETS[event.config.branding.theme]
  const html =
    event.config.legal.privacyHtml ||
    '<p>We use guest RSVP data only to organize this celebration.</p>'
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16" style={{ background: theme.bg, color: theme.text }}>
      <h1 className="font-display text-3xl">Privacy</h1>
      <div className="prose mt-6 max-w-none opacity-80" dangerouslySetInnerHTML={{ __html: sanitize(html) }} />
    </main>
  )
}
