'use client'

import { useState } from 'react'
import { parseGuestCsv } from '@/lib/platform/csv'
import type { Guest } from '@/lib/platform/types'

export function GuestCsvImport({
  eventId,
  onImported,
}: {
  eventId?: string
  onImported?: (guests: Guest[]) => void
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setMessage('')
    const text = await file.text()
    if (eventId) {
      const res = await fetch(`/api/platform/events/${eventId}/guests/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      })
      const data = (await res.json().catch(() => null)) as {
        added?: number
        guests?: Guest[]
        error?: string
      } | null
      setBusy(false)
      if (!res.ok) {
        setMessage(data?.error || 'Falha no CSV')
        return
      }
      setMessage(`${data?.added || 0} convidado(s) importados`)
      onImported?.(data?.guests || [])
      return
    }
    const rows = parseGuestCsv(text)
    onImported?.(rows)
    setBusy(false)
    setMessage(rows.length ? `${rows.length} convidado(s) lidos do CSV` : 'CSV vazio')
  }

  return (
    <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm">
      <p className="text-white/50">
        CSV: <code>familyName,email,partySize,status,meal,dietary,message</code>
      </p>
      <label className="mt-3 inline-flex cursor-pointer rounded-full bg-white/10 px-4 py-2 hover:bg-white/15">
        {busy ? 'A ler…' : 'Importar CSV'}
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void onFile(file)
          }}
        />
      </label>
      {message ? <p className="mt-2 text-cyan-200">{message}</p> : null}
    </div>
  )
}
