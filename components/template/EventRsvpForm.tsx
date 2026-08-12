'use client'

import { useState } from 'react'
import type { EventConfig, PlatformEvent } from '@/lib/platform/types'

export function EventRsvpForm({ event }: { event: PlatformEvent }) {
  const config: EventConfig = event.config
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)
    const res = await fetch(`/api/platform/events/${event.id}/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromPublic: true,
        familyName: form.get('familyName'),
        email: form.get('email'),
        partySize: Number(form.get('partySize') || 1),
        status: form.get('status'),
        meal: form.get('meal'),
        dietary: form.get('dietary'),
        message: form.get('message'),
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error || 'Não foi possível enviar o RSVP.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-8 text-center text-emerald-100">
        Obrigado! Recebemos a confirmação da sua família.
      </p>
    )
  }

  return (
    <form id="rsvp-form" onSubmit={onSubmit} className="space-y-4 text-left">
      <label className="block text-sm">
        Nome da família
        <input
          name="familyName"
          required
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>
      <label className="block text-sm">
        Email
        <input
          name="email"
          type="email"
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Pessoas
          <input
            name="partySize"
            type="number"
            min={1}
            defaultValue={1}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm">
          Presença
          <select
            name="status"
            defaultValue="yes"
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
          >
            <option value="yes">Sim, vamos</option>
            <option value="no">Não poderemos</option>
          </select>
        </label>
      </div>
      {config.rsvp.meals.length > 0 && (
        <label className="block text-sm">
          Refeição
          <select
            name="meal"
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
          >
            {config.rsvp.meals.filter(Boolean).map((meal) => (
              <option key={meal} value={meal}>
                {meal}
              </option>
            ))}
          </select>
        </label>
      )}
      {config.rsvp.collectDietary && (
        <label className="block text-sm">
          Restrições alimentares
          <input
            name="dietary"
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
          />
        </label>
      )}
      <label className="block text-sm">
        Recado
        <textarea
          name="message"
          rows={3}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-cyan-400 py-3 font-semibold text-[#0b1020]"
      >
        {loading ? 'Enviando…' : 'Enviar RSVP'}
      </button>
    </form>
  )
}
