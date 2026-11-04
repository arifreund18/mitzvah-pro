'use client'

import { useState } from 'react'

export function EventContactForm({
  eventId,
  accent,
  muted,
  labels,
}: {
  eventId: string
  accent: string
  muted: string
  labels?: { name?: string; email?: string; message?: string; send?: string; thanks?: string }
}) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nameLabel = labels?.name || 'Name'
  const emailLabel = labels?.email || 'Email'
  const messageLabel = labels?.message || 'Message'
  const sendLabel = labels?.send || 'Send'
  const thanksLabel = labels?.thanks || 'Message sent. Thank you!'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)
    const res = await fetch(`/api/platform/events/${eventId}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        email: form.get('email'),
        message: form.get('message'),
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error || 'Could not send message.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <p className="mt-6 rounded-2xl border border-white/10 px-4 py-6 text-sm" style={{ color: muted }}>
        {thanksLabel}
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-md space-y-3 text-start">
      <label className="block text-sm">
        {nameLabel}
        <input
          name="name"
          required
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>
      <label className="block text-sm">
        {emailLabel}
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>
      <label className="block text-sm">
        {messageLabel}
        <textarea
          name="message"
          required
          rows={4}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full px-6 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
        style={{ background: accent }}
      >
        {loading ? '…' : sendLabel}
      </button>
    </form>
  )
}
