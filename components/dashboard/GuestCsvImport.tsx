'use client'

import { useState } from 'react'
import { parseGuestCsv } from '@/lib/platform/csv'
import type { Guest } from '@/lib/platform/types'

type PreviewRow = {
  family_name: string
  email: string
  guest_name: string
  type: string
  notes: string
  language: string
}

export function GuestCsvImport({
  eventId,
  onImported,
}: {
  eventId?: string
  onImported?: (guests: Guest[]) => void
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [duplicates, setDuplicates] = useState<string[]>([])

  async function previewFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setMessage('')
    setPreview(null)
    setErrors([])
    setDuplicates([])

    if (!eventId) {
      const text = await file.text()
      const rows = parseGuestCsv(text)
      onImported?.(rows)
      setBusy(false)
      setMessage(rows.length ? `${rows.length} convidado(s) lidos do CSV` : 'CSV vazio')
      return
    }

    const form = new FormData()
    form.append('file', file)
    form.append('preview', '1')
    const res = await fetch(`/api/platform/events/${eventId}/guests/import?preview=1`, {
      method: 'POST',
      body: form,
    })
    const data = (await res.json().catch(() => null)) as {
      preview?: PreviewRow[]
      errors?: string[]
      duplicates?: string[]
      error?: string
    } | null
    setBusy(false)
    if (!res.ok && !data?.preview?.length) {
      setMessage(data?.error || 'Falha na pré-visualização')
      return
    }
    setPreview(data?.preview || [])
    setErrors(data?.errors || [])
    setDuplicates(data?.duplicates || [])
    setMessage(
      data?.preview?.length
        ? `${data.preview.length} linha(s) pronta(s) para confirmar`
        : data?.error || 'Nenhuma linha válida',
    )
  }

  async function confirmImport() {
    if (!eventId || !preview?.length) return
    setBusy(true)
    setMessage('')
    const res = await fetch(`/api/platform/events/${eventId}/guests/import?preview=0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, rows: preview }),
    })
    const data = (await res.json().catch(() => null)) as {
      added?: number
      guests?: Guest[]
      error?: string
      errors?: string[]
      duplicates?: string[]
    } | null
    setBusy(false)
    if (!res.ok) {
      setMessage(data?.error || 'Falha no import')
      setErrors(data?.errors || [])
      setDuplicates(data?.duplicates || [])
      return
    }
    setMessage(`${data?.added || 0} convidado(s) importados`)
    setPreview(null)
    setErrors([])
    setDuplicates([])
    onImported?.(data?.guests || [])
  }

  return (
    <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm">
      <p className="text-white/50">
        CSV/XLSX:{' '}
        <code>family_name,email,guest_name,type,notes,language</code>
      </p>
      <label className="mt-3 inline-flex cursor-pointer rounded-full bg-white/10 px-4 py-2 hover:bg-white/15">
        {busy ? 'A ler…' : 'Importar CSV/XLSX'}
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void previewFile(file)
          }}
        />
      </label>
      {message ? <p className="mt-2 text-cyan-200">{message}</p> : null}
      {errors.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-rose-300">
          {errors.slice(0, 8).map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
      {duplicates.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-200">
          {duplicates.slice(0, 8).map((dup) => (
            <li key={dup}>{dup}</li>
          ))}
        </ul>
      ) : null}
      {preview?.length ? (
        <div className="mt-4">
          <div className="max-h-64 overflow-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-white/5 text-white/50">
                <tr>
                  <th className="px-3 py-2">Família</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Convidado</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Notas</th>
                  <th className="px-3 py-2">Idioma</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={`${row.email}-${i}`} className="border-t border-white/10">
                    <td className="px-3 py-2">{row.family_name}</td>
                    <td className="px-3 py-2 text-white/60">{row.email || '—'}</td>
                    <td className="px-3 py-2">{row.guest_name || '—'}</td>
                    <td className="px-3 py-2">{row.type || 'adult'}</td>
                    <td className="px-3 py-2 text-white/60">{row.notes || '—'}</td>
                    <td className="px-3 py-2">{row.language || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmImport()}
              className="rounded-full bg-cyan-400 px-4 py-2 font-semibold text-[#0b1020] disabled:opacity-40"
            >
              {busy ? 'A importar…' : `Confirmar ${preview.length} convidado(s)`}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPreview(null)
                setErrors([])
                setDuplicates([])
                setMessage('')
              }}
              className="rounded-full border border-white/20 px-4 py-2 disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
