'use client'

import { useCallback, useEffect, useState } from 'react'
import { studioUi } from '@/lib/platform/studio-ui'
import type { EmailLog, EventLocale } from '@/lib/platform/types'

export function EmailLogPanel({
  eventId,
  locale = 'en',
}: {
  eventId: string
  locale?: EventLocale
}) {
  const ui = studioUi(locale)
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/platform/events/${eventId}/email-logs?limit=120`)
    const data = (await res.json().catch(() => null)) as {
      logs?: EmailLog[]
      error?: string
    } | null
    setBusy(false)
    if (!res.ok) {
      setError(data?.error || ui.emailLogLoadFailed)
      return
    }
    setLogs(data?.logs || [])
    setLoaded(true)
  }, [eventId, ui.emailLogLoadFailed])

  useEffect(() => {
    if (!open) return
    if (!loaded) void load()
  }, [open, loaded, load])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl">{ui.emailLogTitle}</h3>
          <p className="mt-1 text-sm text-white/50">
            {open ? ui.emailLogHint : ui.emailLogCollapsedHint}
            {loaded && !open && logs.length ? (
              <span className="text-white/35"> · {logs.length}</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {open ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void load()}
              className="rounded-full border border-white/20 px-4 py-1.5 text-xs hover:bg-white/10 disabled:opacity-40"
            >
              {busy ? ui.emailLogRefreshing : ui.emailLogRefresh}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-1.5 text-xs text-cyan-100 hover:bg-cyan-400/20"
            aria-expanded={open}
          >
            {open ? ui.emailLogHide : ui.emailLogShow}
          </button>
        </div>
      </div>

      {open ? (
        <>
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

          {!logs.length && !busy ? (
            <p className="mt-4 text-sm text-white/40">{ui.emailLogEmpty}</p>
          ) : (
            <div className="mt-4 max-h-80 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#12141c] text-xs uppercase tracking-wide text-white/40">
                  <tr>
                    <th className="px-2 py-2 font-medium">{ui.emailLogWhen}</th>
                    <th className="px-2 py-2 font-medium">{ui.emailLogType}</th>
                    <th className="px-2 py-2 font-medium">{ui.emailLogTo}</th>
                    <th className="px-2 py-2 font-medium">{ui.emailLogStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-white/10 text-white/80">
                      <td className="px-2 py-2 whitespace-nowrap text-white/50">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-2">{log.type}</td>
                      <td className="px-2 py-2">{log.toEmail || '—'}</td>
                      <td className="px-2 py-2">
                        <span
                          className={
                            log.status === 'sent'
                              ? 'text-cyan-200'
                              : log.status === 'failed'
                                ? 'text-rose-300'
                                : 'text-amber-200'
                          }
                        >
                          {log.status}
                        </span>
                        {log.error ? (
                          <span className="mt-0.5 block text-xs text-white/40">{log.error}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
