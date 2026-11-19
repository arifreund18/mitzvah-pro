import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import {
  followUpCopy,
  followUpHeadline,
  hostDisplayName,
} from '@/lib/platform/follow-up'
import { formatEventDate, typeLabel } from '@/lib/platform/copy'
import { resolveGuestLocale } from '@/lib/platform/guest-locale'
import { getEventBySlug } from '@/lib/platform/store'
import { eventPublicUrl, hostFromHeaders } from '@/lib/platform/site-url'
import type { HostFollowUpType } from '@/lib/platform/types'

export const dynamic = 'force-dynamic'

function typeBadge(type: HostFollowUpType, locale: string): string {
  if (type === 'reminder') {
    if (locale === 'pt') return 'Lembrete'
    if (locale === 'es') return 'Recordatorio'
    if (locale === 'he') return 'תזכורת'
    return 'Reminder'
  }
  if (type === 'update') {
    if (locale === 'pt') return 'Atualização'
    if (locale === 'es') return 'Actualización'
    if (locale === 'he') return 'עדכון'
    return 'Update'
  }
  if (locale === 'pt') return 'Mensagem'
  if (locale === 'es') return 'Mensaje'
  if (locale === 'he') return 'הודעה'
  return 'Message'
}

export default async function GuestMessagesPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>
}) {
  const { slug, token } = await params
  const event = await getEventBySlug(slug)
  if (!event || event.status === 'archived') notFound()
  const guest = event.guests.find((item) => item.token === token)
  if (!guest) notFound()

  const host = hostFromHeaders(await headers())
  const locale = resolveGuestLocale(guest, event.config)
  const labels = followUpCopy(locale)
  const hostName = hostDisplayName(event.config)
  const title =
    event.config.invitation.design?.eventName?.trim() ||
    `${event.config.basics.honoreeName || 'Mitzvah'}'s ${typeLabel(event.config.basics.type, locale)}`
  const messages = [...(event.config.followUps || [])]
    .filter((item) => item.sentAt && item.body.trim())
    .sort((a, b) => (b.sentAt || b.createdAt).localeCompare(a.sentAt || a.createdAt))

  const cardHref = eventPublicUrl(event.slug, `/card/${guest.token}`, { host })
  const dir = locale === 'he' ? 'rtl' : 'ltr'

  return (
    <main
      className="min-h-screen px-4 py-12"
      style={{ background: '#f4efe6', color: '#3d3429' }}
      dir={dir}
    >
      <div className="mx-auto max-w-lg">
        <p className="font-serif text-3xl leading-tight" style={{ color: '#4a3f32' }}>
          {messages.length
            ? followUpHeadline(messages[0]!.type, locale, hostName)
            : locale === 'pt'
              ? 'Mensagens do evento'
              : locale === 'es'
                ? 'Mensajes del evento'
                : locale === 'he'
                  ? 'הודעות האירוע'
                  : 'Event messages'}
        </p>
        <p className="mt-3 text-base font-semibold">{title}</p>
        {event.config.basics.date ? (
          <p className="mt-1 text-sm opacity-70">
            {formatEventDate(event.config.basics.date, locale)}
          </p>
        ) : null}

        <div className="mt-8 space-y-5">
          {messages.length === 0 ? (
            <p className="rounded-2xl bg-white/60 px-5 py-6 text-sm opacity-80">
              {locale === 'pt'
                ? 'Ainda não há mensagens do anfitrião.'
                : locale === 'es'
                  ? 'Todavía no hay mensajes del anfitrión.'
                  : locale === 'he'
                    ? 'עדיין אין הודעות מהמארחים.'
                    : 'No host messages yet.'}
            </p>
          ) : (
            messages.map((item) => (
              <article key={item.id} className="rounded-2xl bg-white/70 px-5 py-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide opacity-60">
                  <span>{typeBadge(item.type, locale)}</span>
                  <span>·</span>
                  <span>
                    {new Date(item.sentAt || item.createdAt).toLocaleString(
                      locale === 'pt'
                        ? 'pt-BR'
                        : locale === 'es'
                          ? 'es-MX'
                          : locale === 'he'
                            ? 'he-IL'
                            : 'en-US',
                    )}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">
                  {item.body}
                </p>
              </article>
            ))
          )}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link
            href={cardHref}
            className="rounded-full px-5 py-2.5 font-semibold text-white"
            style={{ background: '#4a5a3c' }}
          >
            {labels.viewInvitation}
          </Link>
        </div>
      </div>
    </main>
  )
}
