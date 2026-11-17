'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonType } from '@/lib/platform/types'

export type ManualGuestDraft = {
  familyName: string
  email: string
  guestName: string
  guestType: PersonType
}

export function GuestManualAdd({
  eventId,
  onAdded,
}: {
  eventId?: string
  onAdded?: (guest: ManualGuestDraft) => void
}) {
  const router = useRouter()
  const [familyName, setFamilyName] = useState('')
  const [email, setEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestType, setGuestType] = useState<PersonType>('adult')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'err'>('ok')

  function reset() {
    setFamilyName('')
    setEmail('')
    setGuestName('')
    setGuestType('adult')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const family = familyName.trim()
    const person = guestName.trim()
    if (!family || !person) return

    const draft: ManualGuestDraft = {
      familyName: family,
      email: email.trim(),
      guestName: person,
      guestType,
    }

    if (!eventId) {
      onAdded?.(draft)
      reset()
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
        familyName: family,
        email: draft.email,
        status: 'pending',
        partySize: 1,
        people: [
          {
            name: person,
            type: guestType,
            status: 'pending',
            meal: '',
            dietary: '',
          },
        ],
      }),
    })
    const data = (await res.json().catch(() => null)) as {
      error?: string
      merged?: boolean
    } | null
    setBusy(false)
    if (!res.ok) {
      setTone('err')
      setMessage(data?.error || 'Não foi possível adicionar')
      return
    }
    reset()
    setTone('ok')
    setMessage(
      data?.merged
        ? 'Pessoa adicionada à família existente (mesmo email)'
        : 'Convidado adicionado',
    )
    onAdded?.(draft)
    router.refresh()
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm"
    >
      <p className="text-xs uppercase tracking-wide text-white/40">Adicionar manualmente</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="text-xs text-white/50">Família</span>
          <input
            required
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="Família Silva"
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-white/50">Email(s)</span>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="a@x.com, b@y.com"
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-white/50">Nome do convidado</span>
          <input
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Primeiro nome"
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-white/50">Tipo</span>
          <select
            value={guestType}
            onChange={(e) => setGuestType(e.target.value as PersonType)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-[#12182a] px-3 py-2 outline-none"
          >
            <option value="adult">Adulto</option>
            <option value="child">Criança</option>
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={busy || !familyName.trim() || !guestName.trim()}
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
