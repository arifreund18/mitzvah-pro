'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function EventActions({
  id,
  slug,
  status,
}: {
  id: string
  slug: string
  status: string
}) {
  const router = useRouter()
  const [error, setError] = useState('')

  async function post(path: string) {
    setError('')
    const res = await fetch(path, { method: 'POST' })
    const data = (await res.json().catch(() => null)) as { error?: string; event?: { id: string; slug: string } } | null
    if (!res.ok) {
      setError(data?.error || 'Falha na ação')
      return
    }
    if (path.endsWith('/duplicate') && data?.event) {
      router.push(`/dashboard/events/${data.event.id}`)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={`/dashboard/events/${id}/wizard`}
        className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-[#0b1020]"
      >
        Abrir wizard
      </a>
      {status === 'published' ? (
        <a href={`/e/${slug}`} className="rounded-full border border-white/20 px-5 py-2 text-sm">
          Ver site
        </a>
      ) : (
        <button
          type="button"
          onClick={() => post(`/api/platform/events/${id}/publish`)}
          className="rounded-full border border-white/20 px-5 py-2 text-sm"
        >
          Publicar
        </button>
      )}
      <a href={`/dashboard/events/${id}/guests`} className="rounded-full border border-white/20 px-5 py-2 text-sm">
        Convidados
      </a>
      <button
        type="button"
        onClick={() => post(`/api/platform/events/${id}/duplicate`)}
        className="rounded-full border border-white/20 px-5 py-2 text-sm"
      >
        Duplicar
      </button>
      {status !== 'archived' ? (
        <button
          type="button"
          onClick={() => post(`/api/platform/events/${id}/archive`)}
          className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/60"
        >
          Arquivar
        </button>
      ) : null}
      {error ? <p className="w-full text-sm text-rose-300">{error}</p> : null}
    </div>
  )
}
