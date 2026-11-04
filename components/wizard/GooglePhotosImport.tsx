'use client'

import { useEffect, useState } from 'react'
import { Field, TextInput } from '@/components/wizard/fields'
import type { GalleryItem } from '@/lib/platform/types'

export function GooglePhotosImport({
  eventId,
  onImported,
}: {
  eventId?: string
  onImported: (items: GalleryItem[]) => void
}) {
  const [albumUrl, setAlbumUrl] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!eventId) {
      setConfigured(false)
      return
    }
    void fetch(`/api/platform/events/${eventId}/media/google-photos`)
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false))
  }, [eventId])

  async function importAlbum(apply: boolean) {
    if (!eventId || !albumUrl.trim()) return
    setBusy(true)
    setMessage('')
    const res = await fetch(`/api/platform/events/${eventId}/media/google-photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albumUrl, apply }),
    })
    const data = (await res.json().catch(() => null)) as {
      error?: string
      warning?: string
      preview?: GalleryItem[]
      galleryItems?: GalleryItem[]
      added?: number
      count?: number
    } | null
    setBusy(false)
    if (!res.ok) {
      setMessage(data?.error || data?.warning || 'Falha no import Google Fotos')
      return
    }
    if (!apply && data?.preview) {
      setMessage(`${data.count || data.preview.length} item(ns) no preview — confirme para aplicar`)
      return
    }
    if (data?.galleryItems) {
      onImported(data.galleryItems)
      setMessage(`${data.added || 0} item(ns) importados`)
      setAlbumUrl('')
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm">
      <p className="text-white/50">
        Google Fotos (opcional)
        {configured === false ? ' — API key não configurada neste ambiente' : null}
      </p>
      <Field label="URL ou ID do álbum">
        <TextInput
          value={albumUrl}
          placeholder="https://photos.google.com/share/…"
          onChange={(e) => setAlbumUrl(e.target.value)}
          disabled={!eventId || busy}
        />
      </Field>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!eventId || busy || !albumUrl.trim()}
          onClick={() => void importAlbum(false)}
          className="rounded-full border border-white/20 px-4 py-2 disabled:opacity-40"
        >
          Preview
        </button>
        <button
          type="button"
          disabled={!eventId || busy || !albumUrl.trim() || configured === false}
          onClick={() => void importAlbum(true)}
          className="rounded-full bg-cyan-400 px-4 py-2 font-semibold text-[#0b1020] disabled:opacity-40"
        >
          {busy ? 'A importar…' : 'Importar para galeria'}
        </button>
      </div>
      {message ? <p className="mt-2 text-cyan-200">{message}</p> : null}
      {!eventId ? (
        <p className="mt-2 text-xs text-white/40">
          Guarde o evento e reabra o wizard para importar com o ID do evento.
        </p>
      ) : null}
    </div>
  )
}
