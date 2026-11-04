'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { EventActions } from '@/components/dashboard/EventActions'
import { GuestAdminPanel } from '@/components/dashboard/GuestAdminPanel'
import { GuestCsvImport } from '@/components/dashboard/GuestCsvImport'
import { SECTION_EDITOR_IDS, SECTION_LABELS } from '@/lib/platform/section-editor'
import type { PlatformEvent } from '@/lib/platform/types'
import { eventApexPathUrl, eventPublicHostLabel, eventPublicUrl } from '@/lib/platform/site-url'
import { eventMailDomainName } from '@/lib/platform/mail-domain'

export function EventAdmin({ event }: { event: PlatformEvent }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'ok' | 'err'>('ok')
  const [testTo, setTestTo] = useState('')
  const siteLabel = eventPublicHostLabel(event.slug)
  const siteUrl = eventApexPathUrl(event.slug)
  const subdomainUrl = eventPublicUrl(event.slug)
  const stdUrl = eventPublicUrl(event.slug, '/std')
  const inviteUrl = eventPublicUrl(event.slug, '/invite')
  const guests = event.guests
  const peopleCounts = useMemo(() => {
    let adults = 0
    let children = 0
    for (const guest of guests) {
      for (const person of guest.people || []) {
        if (person.type === 'child') children += 1
        else adults += 1
      }
    }
    return { adults, children }
  }, [guests])
  const stats = useMemo(() => {
    const yes = guests.filter((g) => g.status === 'yes').length
    const no = guests.filter((g) => g.status === 'no').length
    const pending = guests.filter((g) => g.status === 'pending').length
    const people = guests.reduce((sum, g) => sum + (g.status === 'no' ? 0 : g.partySize), 0)
    const std = guests.filter((g) => g.stdSentAt).length
    const invite = guests.filter((g) => g.inviteSentAt).length
    return { yes, no, pending, people, std, invite, total: guests.length }
  }, [guests])

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
      <GuestAdminPanel event={event} />
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
