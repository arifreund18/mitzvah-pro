'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { eventPublicUrl } from '@/lib/platform/site-url'

const btn =
  'rounded-full border border-white/20 px-5 py-2 text-sm hover:bg-white/10 disabled:opacity-40'

export function EventActions({
  id,
  slug,
  status,
  previewToken,
  compact = false,
}: {
  id: string
  slug: string
  status: string
  previewToken?: string
  compact?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const siteUrl = eventPublicUrl(slug)
  const previewUrl = `/p/${previewToken}`

  async function post(path: string, label: string) {
    setError('')
    setBusy(label)
    const res = await fetch(path, { method: 'POST' })
    const data = (await res.json().catch(() => null)) as {
      error?: string
      event?: { id: string; slug: string }
    } | null
    setBusy('')
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

  async function remove() {
    if (!window.confirm('Apagar este evento de forma permanente?')) return
    setError('')
    setBusy('delete')
    const res = await fetch(`/api/platform/events/${id}`, { method: 'DELETE' })
    setBusy('')
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error || 'Não foi possível apagar')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const siteLink = status === 'published' ? (
    <a href={siteUrl} className={btn}>
      Ver site
    </a>
  ) : null

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'gap-3'}`}>
      {compact ? (
        <Link href={`/dashboard/events/${id}`} className={btn}>
          Dashboard do evento
        </Link>
      ) : (
        <Link
          href={`/dashboard/events/${id}/wizard`}
          className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-[#0b1020]"
        >
          Abrir wizard
        </Link>
      )}
      {compact ? (
        <Link href={`/dashboard/events/${id}/wizard`} className={btn}>
          Wizard
        </Link>
      ) : null}
      {previewToken ? (
        <a href={previewUrl} className={btn} target="_blank" rel="noreferrer">
          Preview rascunho
        </a>
      ) : null}
      {siteLink}
      {!compact && status !== 'published' && status !== 'archived' ? (
        <button type="button" className={btn} disabled={!!busy} onClick={() => post(`/api/platform/events/${id}/publish`, 'publish')}>
          Publicar
        </button>
      ) : null}
      {!compact && (
        <button
          type="button"
          className={btn}
          disabled={!!busy}
          onClick={() => post(`/api/platform/events/${id}/duplicate`, 'dup')}
        >
          Duplicar
        </button>
      )}
      {status === 'archived' ? (
        <button
          type="button"
          className={btn}
          disabled={!!busy}
          onClick={() => post(`/api/platform/events/${id}/unarchive`, 'unarchive')}
        >
          {busy === 'unarchive' ? '…' : 'Desarquivar'}
        </button>
      ) : (
        <button
          type="button"
          className={`${btn} text-white/60`}
          disabled={!!busy}
          onClick={() => post(`/api/platform/events/${id}/archive`, 'archive')}
        >
          Arquivar
        </button>
      )}
      <button
        type="button"
        className={`${btn} border-rose-400/40 text-rose-200 hover:bg-rose-400/10`}
        disabled={!!busy}
        onClick={remove}
      >
        {busy === 'delete' ? '…' : 'Apagar'}
      </button>
      {error ? <p className="w-full text-sm text-rose-300">{error}</p> : null}
    </div>
  )
}
