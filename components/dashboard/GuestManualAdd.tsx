'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function GuestManualAdd({
  eventId,
  onAdded,
}: {
  eventId?: string
  onAdded?: (guest: { familyName: string; email: string; partySize: number }) => void
}) {
  const router = useRouter()
  const [familyName, setFamilyName] = useState('')
  const [email, setEmail] = useState('')
  const [partySize, setPartySize] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'err'>('ok')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = familyName.trim()
    if (!name) return

    if (!eventId) {
      onAdded?.({ familyName: name, email: email.trim(), partySize: Math.max(1, partySize) })
      setFamilyName('')
      setEmail('')
      setPartySize(1)
      setTone('ok')
      setMessage('Convidado adicionado à lista')
      return
    }

    setBusy(true)
    setMessage('')
    const res = await fetch(`/api/platform/events/${eventId}/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        familyName: name,
        email: email.trim(),
        partySize: Math.max(1, partySize),
        status: 'pending',
      }),
    })
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    setBusy(false)
    if (!res.ok) {
      setTone('err')
      setMessage(data?.error || 'Não foi possível adicionar')
      return
    }
    setFamilyName('')
    setEmail('')
    setPartySize(1)
    setTone('ok')
    setMessage('Convidado adicionado')
    onAdded?.({ familyName: name, email: email.trim(), partySize })
    router.refresh()
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm"
    >
      <p className="text-xs uppercase tracking-wide text-white/40">Adicionar manualmente</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="text-xs text-white/50">Família</span>
          <input
            required
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="text-xs text-white/50">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="text-xs text-white/50">Pessoas</span>
          <input
            type="number"
            min={1}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value) || 1)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy || !familyName.trim()}
        className="mt-3 rounded-full bg-cyan-400 px-4 py-2 font-semibold text-[#0b1020] disabled:opacity-40"
      >
        {busy ? 'A guardar…' : 'Adicionar convidado'}
      </button>
      {message ? (
        <p className={`mt-2 ${tone === 'err' ? 'text-rose-300' : 'text-cyan-200'}`}>{message}</p>
      ) : null}
    </form>
  )
}
