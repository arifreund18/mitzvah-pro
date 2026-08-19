'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LOCALE_OPTIONS } from '@/lib/platform/locales'
import { type EventLocale } from '@/lib/platform/types'

export function NewEventForm() {
  const router = useRouter()
  const [enabled, setEnabled] = useState<EventLocale[]>(['en', 'pt'])
  const [honoreeName, setHonoreeName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleLocale(locale: EventLocale) {
    setEnabled((current) => {
      if (current.includes(locale)) {
        if (current.length === 1) return current
        return current.filter((item) => item !== locale)
      }
      return [...current, locale]
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/platform/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ honoreeName, familyName, enabled, locale: enabled[0] }),
    })
    const data = (await res.json().catch(() => null)) as { event?: { id: string }; error?: string } | null
    setLoading(false)
    if (!res.ok || !data?.event) {
      setError(
        data?.error ||
          (res.status === 503
            ? 'Persistência não configurada na Vercel. Defina DATABASE_URL e faça redeploy.'
            : 'Não foi possível criar'),
      )
      return
    }
    router.push(`/dashboard/events/${data.event.id}/wizard`)
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-5">
      <fieldset>
        <legend className="text-sm font-medium text-white/80">Idiomas do site</legend>
        <p className="mt-1 text-xs text-white/40">
          Marque todos os idiomas que o site dos convidados terá. No wizard você escolhe em qual idioma vai preencher.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {LOCALE_OPTIONS.map((option) => {
            const selected = enabled.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleLocale(option.value)}
                className={`rounded-xl border px-3 py-3 text-start text-sm ${
                  selected
                    ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/15 bg-white/5 text-white/80'
                }`}
              >
                <span className="block font-medium">
                  {selected ? '✓ ' : ''}
                  {option.label}
                </span>
                <span className="text-xs text-white/40">{option.hint}</span>
              </button>
            )
          })}
        </div>
      </fieldset>
      <label className="block text-sm">
        Nome do celebrante
        <input
          required
          value={honoreeName}
          onChange={(e) => setHonoreeName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>
      <label className="block text-sm">
        Família
        <input
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-[#0b1020]"
      >
        {loading ? 'Criando…' : 'Criar e abrir wizard'}
      </button>
    </form>
  )
}
