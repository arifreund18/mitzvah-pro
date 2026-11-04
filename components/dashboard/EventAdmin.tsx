'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { EventActions } from '@/components/dashboard/EventActions'
import { GuestCsvImport } from '@/components/dashboard/GuestCsvImport'
import { SECTION_EDITOR_IDS, SECTION_LABELS } from '@/lib/platform/section-editor'
import type { Guest, GuestRsvp, PlatformEvent, ScheduleInviteMode } from '@/lib/platform/types'
import { eventApexPathUrl, eventPublicHostLabel, eventPublicUrl } from '@/lib/platform/site-url'
import { eventMailDomainName } from '@/lib/platform/mail-domain'

type RsvpFilter = 'all' | GuestRsvp
type SentFilter = 'all' | 'yes' | 'no'
type SortKey = 'name' | 'rsvp' | 'stdSent' | 'inviteSent'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

function countPeople(guests: Guest[]) {
  let adults = 0
  let children = 0
  for (const guest of guests) {
    for (const person of guest.people || []) {
      if (person.type === 'child') children += 1
      else adults += 1
    }
  }
  return { adults, children }
}

export function EventAdmin({ event }: { event: PlatformEvent }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'ok' | 'err'>('ok')
  const [search, setSearch] = useState('')
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all')
  const [stdFilter, setStdFilter] = useState<SentFilter>('all')
  const [inviteFilter, setInviteFilter] = useState<SentFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [testTo, setTestTo] = useState('')
  const siteLabel = eventPublicHostLabel(event.slug)
  const siteUrl = eventApexPathUrl(event.slug)
  const subdomainUrl = eventPublicUrl(event.slug)
  const stdUrl = eventPublicUrl(event.slug, '/std')
  const inviteUrl = eventPublicUrl(event.slug, '/invite')
  const guests = event.guests
  const scheduleItems = event.config.schedule.items || []
  const peopleCounts = useMemo(() => countPeople(guests), [guests])
  const stats = useMemo(() => {
    const yes = guests.filter((g) => g.status === 'yes').length
    const no = guests.filter((g) => g.status === 'no').length
    const pending = guests.filter((g) => g.status === 'pending').length
    const people = guests.reduce((sum, g) => sum + (g.status === 'no' ? 0 : g.partySize), 0)
    const std = guests.filter((g) => g.stdSentAt).length
    const invite = guests.filter((g) => g.inviteSentAt).length
    return { yes, no, pending, people, std, invite, total: guests.length }
  }, [guests])

  const visibleGuests = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = guests.filter((guest) => {
      if (rsvpFilter !== 'all' && guest.status !== rsvpFilter) return false
      if (stdFilter === 'yes' && !guest.stdSentAt) return false
      if (stdFilter === 'no' && guest.stdSentAt) return false
      if (inviteFilter === 'yes' && !guest.inviteSentAt) return false
      if (inviteFilter === 'no' && guest.inviteSentAt) return false
      if (!q) return true
      const hay = `${guest.familyName} ${guest.email} ${(guest.emails || []).join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
    const rankRsvp = (status: GuestRsvp) =>
      status === 'yes' ? 0 : status === 'pending' ? 1 : 2
    return filtered.sort((a, b) => {
      if (sortKey === 'rsvp') {
        const diff = rankRsvp(a.status) - rankRsvp(b.status)
        return diff || a.familyName.localeCompare(b.familyName)
      }
      if (sortKey === 'stdSent') {
        const av = a.stdSentAt || ''
        const bv = b.stdSentAt || ''
        return bv.localeCompare(av) || a.familyName.localeCompare(b.familyName)
      }
      if (sortKey === 'inviteSent') {
        const av = a.inviteSentAt || ''
        const bv = b.inviteSentAt || ''
        return bv.localeCompare(av) || a.familyName.localeCompare(b.familyName)
      }
      return a.familyName.localeCompare(b.familyName)
    })
  }, [guests, search, rsvpFilter, stdFilter, inviteFilter, sortKey])

  async function pollSendJob(jobId: string, kind: 'std' | 'invite') {
    const maxAttempts = 120
    for (let i = 0; i < maxAttempts; i += 1) {
      const statusRes = await fetch(
        `/api/platform/events/${event.id}/send/status?jobId=${encodeURIComponent(jobId)}`,
      )
      const status = (await statusRes.json().catch(() => null)) as {
        error?: string
        status?: string
        total?: number
        processed?: number
        succeeded?: number
        failed?: number
        remaining?: number
        percent?: number
        done?: boolean
      } | null
      if (!statusRes.ok) {
        setMessageTone('err')
        setMessage(status?.error || 'Falha ao consultar progresso do envio')
        setBusy('')
        return
      }
      setMessage(
        `Fila ${kind === 'std' ? 'STD' : 'convites'}: ${status?.processed || 0}/${status?.total || 0} (${status?.percent || 0}%)` +
          (status?.failed ? ` · ${status.failed} falha(s)` : ''),
      )
      if (status?.done || status?.status === 'completed' || status?.status === 'failed') {
        setMessageTone(status.failed || status.status === 'failed' ? 'err' : 'ok')
        setMessage(
          `Envio concluído: ${status.succeeded || 0} enviado(s)` +
            (status.failed ? ` · ${status.failed} falha(s)` : ''),
        )
        setBusy('')
        router.refresh()
        return
      }
      if ((status?.remaining || 0) > 0) {
        void fetch(`/api/platform/events/${event.id}/send/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        }).catch(() => undefined)
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    setMessageTone('err')
    setMessage('Tempo esgotado à espera da fila de envio')
    setBusy('')
  }

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
      warning?: string
      sent?: number
      delivered?: number
      failed?: number
      local?: boolean
      from?: string
      queued?: boolean
      jobId?: string
      total?: number
    } | null
    if (!res.ok) {
      setBusy('')
      setMessageTone('err')
      setMessage(data?.error || 'Não foi possível enviar')
      router.refresh()
      return
    }
    if (data?.queued && data.jobId) {
      setMessageTone('ok')
      setMessage(`Fila criada: 0/${data.total || 0} — a processar…`)
      await pollSendJob(data.jobId, kind)
      return
    }
    setBusy('')
    setMessageTone(data?.local || data?.failed ? 'err' : 'ok')
    if (data?.local) {
      setMessage(data.warning || `${data.sent || 0} marcado(s) localmente, sem envio real`)
    } else {
      const failed = data?.failed ? ` · ${data.failed} falha(s)` : ''
      setMessage(`${data?.delivered || data?.sent || 0} enviado(s)${failed}${data?.from ? ` · de ${data.from}` : ''}`)
    }
    router.refresh()
  }

  async function sendTest(kind: 'std' | 'invite') {
    const to = testTo.trim()
    if (!to) {
      setMessageTone('err')
      setMessage('Informe um email para o envio de teste')
      return
    }
    setBusy(`test-${kind}`)
    setMessage('')
    const res = await fetch(`/api/platform/events/${event.id}/send/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, to }),
    })
    const data = (await res.json().catch(() => null)) as {
      error?: string
      warning?: string
      local?: boolean
      to?: string
    } | null
    setBusy('')
    if (!res.ok) {
      setMessageTone('err')
      setMessage(data?.error || 'Falha no envio de teste')
      return
    }
    setMessageTone(data?.local ? 'err' : 'ok')
    setMessage(
      data?.local
        ? data.warning || `Teste ${kind} marcado localmente (sem Resend)`
        : `Teste ${kind} enviado para ${data?.to || to}`,
    )
  }

  async function retryMailDomain() {
    setBusy('mail')
    setMessage('')
    const res = await fetch(`/api/platform/events/${event.id}/provision-mail`, { method: 'POST' })
    const data = (await res.json().catch(() => null)) as {
      error?: string
      mail?: { status: string; fromEmail: string; lastError: string }
    } | null
    setBusy('')
    if (!res.ok) {
      setMessageTone('err')
      setMessage(data?.error || 'Não foi possível provisionar o domínio de email')
      router.refresh()
      return
    }
    setMessageTone('ok')
    setMessage(
      data?.mail?.status === 'verified'
        ? `Domínio isolado verificado · ${data.mail.fromEmail}`
        : data?.mail?.status === 'pending'
          ? `DNS criado; verificação Resend pendente · ${data.mail.fromEmail}`
          : 'Domínio de email atualizado',
    )
    router.refresh()
  }

  async function retrySiteDomain() {
    setBusy('site')
    setMessage('')
    const res = await fetch(`/api/platform/events/${event.id}/provision-site`, { method: 'POST' })
    const data = (await res.json().catch(() => null)) as {
      error?: string
      site?: { host: string; status: string; lastError: string }
    } | null
    setBusy('')
    if (!res.ok) {
      setMessageTone('err')
      setMessage(data?.error || 'Não foi possível provisionar o subdomínio')
      return
    }
    setMessageTone(data?.site?.status === 'failed' ? 'err' : 'ok')
    setMessage(
      data?.site?.status === 'failed'
        ? data.site.lastError || 'Falha no subdomínio'
        : `Subdomínio ${data?.site?.host} — ${data?.site?.lastError || 'DNS atualizado'}`,
    )
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Dashboard do evento</p>
      <h1 className="font-display mt-2 text-4xl">{event.config.basics.honoreeName || 'Evento'}</h1>
      <p className="mt-2 text-white/50">
        Família {event.config.basics.familyName || '—'} ·{' '}
        <a href={siteUrl} className="text-cyan-200 hover:underline">
          {siteUrl.replace(/^https?:\/\//, '')}
        </a>
        {event.status === 'published' ? (
          <span className="text-white/35"> · canonical: {siteLabel}</span>
        ) : null}
      </p>
      {event.status === 'published' ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <a href={subdomainUrl} className="text-white/50 hover:text-white">
            Abrir {siteLabel}
          </a>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void retrySiteDomain()}
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
          >
            {busy === 'site' ? 'A provisionar…' : 'Ativar subdomínio DNS'}
          </button>
        </div>
      ) : null}
      <MailDomainStatus
        mail={event.config.domain.mail}
        slug={event.slug}
        busy={busy === 'mail'}
        onRetry={() => void retryMailDomain()}
      />
      <CustomDomainPanel eventId={event.id} domain={event.config.domain} />
      <div className="mt-8">
        <EventActions id={event.id} slug={event.slug} status={event.status} previewToken={event.previewToken} />
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
      <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="block min-w-56 flex-1">
          <span className="text-xs uppercase text-white/40">Email de teste</span>
          <input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="voce@email.com"
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
          />
        </label>
        <button
          type="button"
          disabled={!!busy || !event.config.saveTheDate.enabled}
          onClick={() => void sendTest('std')}
          className="rounded-full border border-cyan-400/40 px-4 py-2 text-cyan-100 hover:bg-cyan-400/10 disabled:opacity-40"
        >
          {busy === 'test-std' ? 'Enviando…' : 'Enviar teste STD'}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void sendTest('invite')}
          className="rounded-full border border-white/25 px-4 py-2 hover:bg-white/10 disabled:opacity-40"
        >
          {busy === 'test-invite' ? 'Enviando…' : 'Enviar teste convite'}
        </button>
      </div>
      {message ? (
        <p className={`mt-3 text-sm ${messageTone === 'err' ? 'text-rose-300' : 'text-cyan-200'}`}>{message}</p>
      ) : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          ['Convidados', String(stats.total)],
          ['Pessoas (sim/pendente)', String(stats.people)],
          ['Adultos / crianças', `${peopleCounts.adults} / ${peopleCounts.children}`],
          ['RSVP sim / não / pendente', `${stats.yes} / ${stats.no} / ${stats.pending}`],
          ['STD enviados', String(stats.std)],
          ['Convites enviados', String(stats.invite)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase text-white/40">{label}</p>
            <p className="mt-2 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display mt-12 text-2xl">Editar seção</h2>
      <p className="mt-2 text-sm text-white/50">
        Edite uma seção do evento publicado sem reabrir o wizard completo.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTION_EDITOR_IDS.map((section) => (
          <Link
            key={section}
            href={`/dashboard/events/${event.id}/sections/${section}`}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:border-cyan-400/40 hover:bg-cyan-400/5"
          >
            {SECTION_LABELS[section]}
          </Link>
        ))}
      </div>

      <h2 id="guests" className="font-display mt-12 text-2xl">
        Convidados
      </h2>
      <p className="mt-2 text-sm text-white/50">
        Envie Save the Date e convite por email. Sem Resend no localhost, o status é marcado mesmo assim.
        Com Vercel DNS + Resend, cada evento usa o remetente isolado do slug.
      </p>
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <GuestCsvImport eventId={event.id} onImported={() => router.refresh()} />
        <a
          href={`/api/platform/events/${event.id}/guests/export`}
          className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
        >
          Exportar CSV
        </a>
        <a
          href={`/api/platform/events/${event.id}/guests/export?format=xlsx`}
          className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
        >
          Exportar XLSX
        </a>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block text-sm lg:col-span-2">
          <span className="text-xs uppercase text-white/40">Buscar</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Família ou email"
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase text-white/40">RSVP</span>
          <select
            value={rsvpFilter}
            onChange={(e) => setRsvpFilter(e.target.value as RsvpFilter)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1020] px-3 py-2 outline-none"
          >
            <option value="all">Todos</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
            <option value="pending">Pendente</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase text-white/40">STD enviado</span>
          <select
            value={stdFilter}
            onChange={(e) => setStdFilter(e.target.value as SentFilter)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1020] px-3 py-2 outline-none"
          >
            <option value="all">Todos</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase text-white/40">Convite enviado</span>
          <select
            value={inviteFilter}
            onChange={(e) => setInviteFilter(e.target.value as SentFilter)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1020] px-3 py-2 outline-none"
          >
            <option value="all">Todos</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </label>
      </div>
      <div className="mt-3">
        <label className="inline-flex items-center gap-2 text-sm text-white/60">
          Ordenar por
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-white/15 bg-[#0b1020] px-3 py-1.5 outline-none"
          >
            <option value="name">Nome</option>
            <option value="rsvp">RSVP</option>
            <option value="stdSent">STD enviado</option>
            <option value="inviteSent">Convite enviado</option>
          </select>
        </label>
        <span className="ml-3 text-xs text-white/35">
          {visibleGuests.length} de {guests.length}
        </span>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Família</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Pessoas</th>
              <th className="px-4 py-3 font-medium">RSVP</th>
              <th className="px-4 py-3 font-medium">Save the Date</th>
              <th className="px-4 py-3 font-medium">Convite</th>
              <th className="px-4 py-3 font-medium">Agenda do convite</th>
            </tr>
          </thead>
          <tbody>
            {visibleGuests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  {guests.length === 0
                    ? 'Nenhum convidado ainda. Adicione no wizard ou aqui depois.'
                    : 'Nenhum convidado corresponde aos filtros.'}
                </td>
              </tr>
            ) : (
              visibleGuests.map((guest) => (
                <tr key={guest.id} className="border-t border-white/10 align-top">
                  <td className="px-4 py-3">{guest.familyName}</td>
                  <td className="px-4 py-3 text-white/60">{guest.email || '—'}</td>
                  <td className="px-4 py-3">
                    {guest.partySize}
                    <span className="mt-1 block text-xs text-white/35">
                      {guest.people.filter((p) => p.type === 'adult').length}A /{' '}
                      {guest.people.filter((p) => p.type === 'child').length}C
                    </span>
                  </td>
                  <td className="px-4 py-3">{guest.status}</td>
                  <td className="px-4 py-3 text-white/60">{fmt(guest.stdSentAt)}</td>
                  <td className="px-4 py-3 text-white/60">{fmt(guest.inviteSentAt)}</td>
                  <td className="px-4 py-3">
                    <GuestScheduleEditor
                      eventId={event.id}
                      guest={guest}
                      scheduleItems={scheduleItems}
                      onSaved={() => router.refresh()}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GuestScheduleEditor({
  eventId,
  guest,
  scheduleItems,
  onSaved,
}: {
  eventId: string
  guest: Guest
  scheduleItems: PlatformEvent['config']['schedule']['items']
  onSaved: () => void
}) {
  const [mode, setMode] = useState<ScheduleInviteMode>(guest.scheduleInviteMode || 'all')
  const [ids, setIds] = useState<string[]>(guest.scheduleItemIds || [])
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')

  async function save(nextMode: ScheduleInviteMode, nextIds: string[]) {
    setBusy(true)
    setHint('')
    const res = await fetch(`/api/platform/events/${eventId}/guests`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestId: guest.id,
        scheduleInviteMode: nextMode,
        scheduleItemIds: nextMode === 'subset' ? nextIds : [],
      }),
    })
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    setBusy(false)
    if (!res.ok) {
      setHint(data?.error || 'Falha ao guardar')
      return
    }
    setHint('Guardado')
    onSaved()
  }

  return (
    <div className="min-w-56 space-y-2">
      <select
        value={mode}
        disabled={busy}
        onChange={(e) => {
          const next = e.target.value as ScheduleInviteMode
          setMode(next)
          void save(next, ids)
        }}
        className="w-full rounded-lg border border-white/15 bg-[#0b1020] px-2 py-1.5 text-xs outline-none"
      >
        <option value="all">Toda a agenda</option>
        <option value="subset">Subset</option>
        <option value="none">Nenhuma</option>
      </select>
      {mode === 'subset' ? (
        <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
          {scheduleItems.length === 0 ? (
            <p className="text-xs text-white/40">Sem itens na agenda</p>
          ) : (
            scheduleItems.map((item) => {
              const checked = ids.includes(item.id)
              return (
                <label key={item.id} className="flex items-start gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? Array.from(new Set([...ids, item.id]))
                        : ids.filter((id) => id !== item.id)
                      setIds(next)
                      void save('subset', next)
                    }}
                    className="mt-0.5"
                  />
                  <span>{item.title || item.id}</span>
                </label>
              )
            })
          )}
        </div>
      ) : null}
      {hint ? <p className="text-[11px] text-cyan-200/80">{hint}</p> : null}
    </div>
  )
}

function CustomDomainPanel({
  eventId,
  domain,
}: {
  eventId: string
  domain: PlatformEvent['config']['domain']
}) {
  const router = useRouter()
  const [host, setHost] = useState(domain.customHost)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')

  async function save(verify = false) {
    setBusy(true)
    setHint('')
    const res = await fetch(`/api/platform/events/${eventId}/custom-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verify ? { verify: true } : { host }),
    })
    const data = (await res.json().catch(() => null)) as { error?: string; hint?: string } | null
    setBusy(false)
    if (!res.ok) {
      setHint(data?.error || 'Falha no domínio')
      return
    }
    setHint(data?.hint || (verify ? 'Verificação concluída' : 'Domínio guardado'))
    router.refresh()
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
      <p className="text-xs uppercase text-white/40">Domínio Signature</p>
      <p className="mt-1 text-white/60">
        Status: {domain.customHostStatus}
        {domain.customHostToken ? ` · TXT mitzvah-site=${domain.customHostToken}` : ''}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="www.familia.com"
          className="min-w-56 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
        />
        <button type="button" disabled={busy} onClick={() => void save(false)} className="rounded-full bg-white/10 px-4 py-2">
          Guardar
        </button>
        <button type="button" disabled={busy} onClick={() => void save(true)} className="rounded-full bg-white/10 px-4 py-2">
          Verificar DNS
        </button>
      </div>
      {hint ? <p className="mt-2 text-cyan-200">{hint}</p> : null}
    </div>
  )
}

function MailDomainStatus({
  mail,
  slug,
  busy,
  onRetry,
}: {
  mail: { status: string; fromEmail: string; sendingDomain: string; lastError: string }
  slug: string
  busy?: boolean
  onRetry?: () => void
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
          : `Email compartilhado (configure VERCEL_TOKEN + Resend para isolar ${domain})`
  const needsRetry = mail.status === 'failed' || mail.status === 'pending' || mail.status === 'skipped'
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
      <p className={mail.status === 'failed' ? 'text-rose-300' : 'text-white/40'}>
        {label}
        {mail.lastError && mail.status !== 'verified' ? ` — ${mail.lastError}` : ''}
      </p>
      {needsRetry && onRetry ? (
        <button
          type="button"
          disabled={busy}
          onClick={onRetry}
          className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
        >
          {busy ? 'A provisionar…' : 'Reparar domínio de email'}
        </button>
      ) : null}
    </div>
  )
}
