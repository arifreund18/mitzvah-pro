'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { studioUi } from '@/lib/platform/studio-ui'
import { eventPublicUrl } from '@/lib/platform/site-url'
import type { EventLocale } from '@/lib/platform/types'

const btn =
  'rounded-full border border-white/20 px-5 py-2 text-sm hover:bg-white/10 disabled:opacity-40'

export function EventActions({
  id,
  slug,
  status,
  previewToken,
  compact = false,
  locale = 'en',
}: {
  id: string
  slug: string
  status: string
  previewToken?: string
  compact?: boolean
  locale?: EventLocale
}) {
  const router = useRouter()
  const ui = studioUi(locale)
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
      approvalUrl?: string
    } | null
    setBusy('')
    if (!res.ok) {
      setError(data?.error || ui.actionFailed)
      return
    }
    if (data?.approvalUrl) {
      window.prompt(ui.approvalPrompt, `${window.location.origin}${data.approvalUrl}`)
    }
    if (path.endsWith('/duplicate') && data?.event) {
      router.push(`/dashboard/events/${data.event.id}`)
      return
    }
    router.refresh()
  }

  async function remove() {
    if (!window.confirm(ui.deleteConfirm)) return
    setError('')
    setBusy('delete')
    const res = await fetch(`/api/platform/events/${id}`, { method: 'DELETE' })
    setBusy('')
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error || ui.deleteFailed)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const siteLink =
    status === 'published' ? (
      <a href={siteUrl} className={btn}>
        {ui.viewSite}
      </a>
    ) : null

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'gap-3'}`}>
      {compact ? (
        <Link href={`/dashboard/events/${id}`} className={btn}>
          {ui.eventDashboard}
        </Link>
      ) : (
        <Link
          href={`/dashboard/events/${id}/wizard`}
          className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-[#0b1020]"
        >
          {ui.openWizard}
        </Link>
      )}
      {compact ? (
        <Link href={`/dashboard/events/${id}/wizard`} className={btn}>
          {ui.wizard}
        </Link>
      ) : null}
      {previewToken ? (
        <a href={previewUrl} className={btn} target="_blank" rel="noreferrer">
          {ui.draftPreview}
        </a>
      ) : null}
      {siteLink}
      {!compact && status !== 'published' && status !== 'archived' ? (
        <button
          type="button"
          className={btn}
          disabled={!!busy}
          onClick={() => post(`/api/platform/events/${id}/publish`, 'publish')}
        >
          {ui.publish}
        </button>
      ) : null}
      {!compact && status !== 'published' && status !== 'archived' && status !== 'approved' ? (
        <button
          type="button"
          className={btn}
          disabled={!!busy}
          onClick={() => post(`/api/platform/events/${id}/request-approval`, 'approve')}
        >
          {status === 'pending_review' ? ui.approvalLink : ui.requestApproval}
        </button>
      ) : null}
      {!compact && (
        <button
          type="button"
          className={btn}
          disabled={!!busy}
          onClick={() => post(`/api/platform/events/${id}/duplicate`, 'dup')}
        >
          {ui.duplicate}
        </button>
      )}
      {status === 'archived' ? (
        <button
          type="button"
          className={btn}
          disabled={!!busy}
          onClick={() => post(`/api/platform/events/${id}/unarchive`, 'unarchive')}
        >
          {busy === 'unarchive' ? '…' : ui.unarchive}
        </button>
      ) : (
        <button
          type="button"
          className={`${btn} text-white/60`}
          disabled={!!busy}
          onClick={() => post(`/api/platform/events/${id}/archive`, 'archive')}
        >
          {ui.archive}
        </button>
      )}
      <button
        type="button"
        className={`${btn} border-rose-400/40 text-rose-200 hover:bg-rose-400/10`}
        disabled={!!busy}
        onClick={remove}
      >
        {busy === 'delete' ? '…' : ui.delete}
      </button>
      {error ? <p className="w-full text-sm text-rose-300">{error}</p> : null}
    </div>
  )
}
