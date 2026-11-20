'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { studioUi } from '@/lib/platform/studio-ui'
import type {
  EventLocale,
  HostFollowUp,
  HostFollowUpAudience,
  HostFollowUpType,
  PlatformEvent,
} from '@/lib/platform/types'

const TYPES: HostFollowUpType[] = ['reminder', 'message', 'update']
const AUDIENCES: HostFollowUpAudience[] = ['all', 'yes', 'pending', 'no']

export function FollowUpPanel({
  event,
  locale = 'en',
}: {
  event: PlatformEvent
  locale?: EventLocale
}) {
  const router = useRouter()
  const ui = studioUi(locale)
  const [type, setType] = useState<HostFollowUpType>('message')
  const [audience, setAudience] = useState<HostFollowUpAudience>('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'err'>('ok')

  const history = useMemo(
    () =>
      [...(event.config.followUps || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [event.config.followUps],
  )

  const typeLabel = (value: HostFollowUpType) => {
    if (value === 'reminder') return ui.followUpTypeReminder
    if (value === 'update') return ui.followUpTypeUpdate
    return ui.followUpTypeMessage
  }

  const audienceLabel = (value: HostFollowUpAudience) => {
    if (value === 'yes') return ui.followUpAudienceYes
    if (value === 'pending') return ui.followUpAudiencePending
    if (value === 'no') return ui.followUpAudienceNo
    return ui.followUpAudienceAll
  }

  async function send() {
    if (busy) return
    setBusy(true)
    setMessage('')
    const res = await fetch(`/api/platform/events/${event.id}/follow-ups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        audience,
        subject: subject.trim() || undefined,
        body,
      }),
    })
    const data = (await res.json().catch(() => null)) as {
      error?: string
      warning?: string
      delivered?: number
      sent?: number
      failed?: number
      deferred?: number
      local?: boolean
      recipients?: number
      from?: string
      followUp?: HostFollowUp
    } | null
    setBusy(false)
    if (!res.ok) {
      setTone('err')
      setMessage(data?.error || ui.followUpSendFailed)
      return
    }
    setTone(data?.local || data?.failed ? 'err' : 'ok')
    if (data?.local) {
      setMessage(data.warning || ui.followUpLocalOk)
    } else {
      const failed = data?.failed ? ` · ${data.failed} ${ui.followUpFailures}` : ''
      const deferred = data?.deferred ? ` · ${data.deferred} ${ui.followUpDeferred}` : ''
      setMessage(
        `${data?.delivered || data?.sent || 0} ${ui.followUpSent}${failed}${deferred}${
          data?.from ? ` · ${data.from}` : ''
        }`,
      )
    }
    setBody('')
    setSubject('')
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="font-display text-xl">{ui.followUpTitle}</h3>
      <p className="mt-2 text-sm text-white/50">{ui.followUpHint}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-white/40">{ui.followUpType}</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as HostFollowUpType)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1020] px-3 py-2 outline-none"
          >
            {TYPES.map((item) => (
              <option key={item} value={item}>
                {typeLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-white/40">{ui.followUpAudience}</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as HostFollowUpAudience)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1020] px-3 py-2 outline-none"
          >
            {AUDIENCES.map((item) => (
              <option key={item} value={item}>
                {audienceLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="text-xs uppercase tracking-wide text-white/40">{ui.followUpSubject}</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={ui.followUpSubjectPlaceholder}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="text-xs uppercase tracking-wide text-white/40">{ui.followUpBody}</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder={ui.followUpBodyPlaceholder}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || body.trim().length < 3}
          aria-busy={busy}
          onClick={() => {
            if (busy) return
            void send()
          }}
          className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-[#0b1020] disabled:pointer-events-none disabled:opacity-40"
        >
          {busy ? ui.sending : ui.followUpSend}
        </button>
        <p className="text-xs text-white/40">{ui.followUpSendHint}</p>
      </div>

      {message ? (
        <p className={`mt-3 text-sm ${tone === 'err' ? 'text-rose-300' : 'text-cyan-200'}`}>
          {message}
        </p>
      ) : null}

      {history.length ? (
        <div className="mt-8">
          <p className="text-xs uppercase tracking-wide text-white/40">{ui.followUpHistory}</p>
          <ul className="mt-3 space-y-3">
            {history.slice(0, 8).map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2 text-white/70">
                  <span className="font-semibold text-white">{typeLabel(item.type)}</span>
                  <span>·</span>
                  <span>{audienceLabel(item.audience)}</span>
                  <span>·</span>
                  <span>
                    {item.sentCount} {ui.followUpSent}
                    {item.failedCount ? ` · ${item.failedCount} ${ui.followUpFailures}` : ''}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-white/80">
                  {item.body.length > 220 ? `${item.body.slice(0, 219)}…` : item.body}
                </p>
                <p className="mt-2 text-xs text-white/35">
                  {item.sentAt
                    ? new Date(item.sentAt).toLocaleString()
                    : new Date(item.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
