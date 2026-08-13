'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { EventActions } from '@/components/dashboard/EventActions'
import type { PlatformEvent } from '@/lib/platform/types'
import { eventPublicHostLabel, eventPublicUrl } from '@/lib/platform/site-url'
import { eventMailDomainName } from '@/lib/platform/mail-domain'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

export function EventAdmin({ event }: { event: PlatformEvent }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const siteLabel = eventPublicHostLabel(event.slug)
  const stdUrl = eventPublicUrl(event.slug, '/std')
  const inviteUrl = eventPublicUrl(event.slug, '/invite')
  const guests = event.guests
  const stats = useMemo(() => {
    const yes = guests.filter((g) => g.status === 'yes').length
    const no = guests.filter((g) => g.status === 'no').length
    const pending = guests.filter((g) => g.status === 'pending').length
    const people = guests.reduce((sum, g) => sum + (g.status === 'no' ? 0 : g.partySize), 0)
    const std = guests.filter((g) => g.stdSentAt).length
    const invite = guests.filter((g) => g.inviteSentAt).length
    return { yes, no, pending, people, std, invite, total: guests.length }
  }, [guests])

  async function send(kind: 'std' | 'invite') {
    setBusy(kind)
    setMessage('')
    const res = await fetch(`/api/platform/events/${event.id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    })
    const data = (await res.json().catch(() => null)) as {
      error?: string
      sent?: number
      delivered?: number
      local?: boolean
    } | null
    setBusy('')
    if (!res.ok) {
      setMessage(data?.error || 'Não foi possível enviar')
      return
    }
    const local = data?.local ? ' (localhost: marcado como enviado, sem Resend)' : ''
    setMessage(`${data?.sent || 0} email(s) na fila${local}`)
    router.refresh()
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Dashboard do evento</p>
      <h1 className="font-display mt-2 text-4xl">{event.config.basics.honoreeName || 'Evento'}</h1>
      <p className="mt-2 text-white/50">
        Família {event.config.basics.familyName || '—'} · {siteLabel}
      </p>
      <MailDomainStatus mail={event.config.domain.mail} slug={event.slug} />
      <div className="mt-8">
        <EventActions id={event.id} slug={event.slug} status={event.status} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <a href={stdUrl} className="rounded-full border border-white/20 px-4 py-2 hover:bg-white/10">
          Preview Save the Date
        </a>
        <a href={inviteUrl} className="rounded-full border border-white/20 px-4 py-2 hover:bg-white/10">
          Preview convite
        </a>
        <button
          type="button"
          disabled={!!busy || !event.config.saveTheDate.enabled}
          onClick={() => send('std')}
          className="rounded-full bg-cyan-400 px-4 py-2 font-semibold text-[#0b1020] disabled:opacity-40"
        >
          {busy === 'std' ? 'Enviando…' : 'Enviar Save the Date'}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => send('invite')}
          className="rounded-full bg-white px-4 py-2 font-semibold text-[#0b1020] disabled:opacity-40"
        >
          {busy === 'invite' ? 'Enviando…' : 'Enviar convites'}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-cyan-200">{message}</p> : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Convidados', String(stats.total)],
          ['Pessoas (sim/pendente)', String(stats.people)],
          ['RSVP sim / não / pendente', `${stats.yes} / ${stats.no} / ${stats.pending}`],
          ['STD / convites enviados', `${stats.std} / ${stats.invite}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase text-white/40">{label}</p>
            <p className="mt-2 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <h2 id="guests" className="font-display mt-12 text-2xl">
        Convidados
      </h2>
      <p className="mt-2 text-sm text-white/50">
        Envie Save the Date e convite por email. Sem Resend no localhost, o status é marcado mesmo assim.
        Com Cloudflare + Resend, cada evento usa o remetente isolado do slug.
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Família</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Pessoas</th>
              <th className="px-4 py-3 font-medium">RSVP</th>
              <th className="px-4 py-3 font-medium">Save the Date</th>
              <th className="px-4 py-3 font-medium">Convite</th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  Nenhum convidado ainda. Adicione no wizard ou aqui depois.
                </td>
              </tr>
            ) : (
              guests.map((guest) => (
                <tr key={guest.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{guest.familyName}</td>
                  <td className="px-4 py-3 text-white/60">{guest.email || '—'}</td>
                  <td className="px-4 py-3">{guest.partySize}</td>
                  <td className="px-4 py-3">{guest.status}</td>
                  <td className="px-4 py-3 text-white/60">{fmt(guest.stdSentAt)}</td>
                  <td className="px-4 py-3 text-white/60">{fmt(guest.inviteSentAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MailDomainStatus({
  mail,
  slug,
}: {
  mail: { status: string; fromEmail: string; sendingDomain: string; lastError: string }
  slug: string
}) {
  const domain = mail.sendingDomain || eventMailDomainName(slug)
  const from = mail.fromEmail || `convites@${domain}`
  const label =
    mail.status === 'verified'
      ? `Email isolado · ${from}`
      : mail.status === 'pending'
        ? `Email DNS pendente · ${from}`
        : mail.status === 'failed'
          ? `Email: falha no domínio · ${from}`
          : `Email compartilhado (configure Cloudflare + Resend para isolar ${domain})`
  return (
    <p className={`mt-2 text-sm ${mail.status === 'failed' ? 'text-rose-300' : 'text-white/40'}`}>
      {label}
      {mail.lastError && mail.status !== 'verified' ? ` — ${mail.lastError}` : ''}
    </p>
  )
}
