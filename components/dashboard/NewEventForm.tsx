'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LOCALE_OPTIONS } from '@/lib/platform/locales'
import { DEFAULT_PRODUCTS, toggleProduct } from '@/lib/platform/products'
import { studioUi } from '@/lib/platform/studio-ui'
import { type EventLocale, type EventProducts } from '@/lib/platform/types'

export function NewEventForm({ locale = 'en' }: { locale?: EventLocale }) {
  const router = useRouter()
  const ui = studioUi(locale)
  const [enabled, setEnabled] = useState<EventLocale[]>([locale])
  const [honoreeName, setHonoreeName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [products, setProducts] = useState<EventProducts>({ ...DEFAULT_PRODUCTS })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const productOptions: { id: keyof EventProducts; title: string; hint: string }[] = [
    { id: 'site', title: ui.productSite, hint: ui.productSiteHint },
    { id: 'invitation', title: ui.productInvite, hint: ui.productInviteHint },
    { id: 'saveTheDate', title: ui.productStd, hint: ui.productStdHint },
  ]

  function toggleLocale(next: EventLocale) {
    setEnabled((current) => {
      if (current.includes(next)) {
        if (current.length === 1) return current
        return current.filter((item) => item !== next)
      }
      return [...current, next]
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/platform/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        honoreeName,
        familyName,
        enabled,
        locale: enabled[0],
        products,
      }),
    })
    const data = (await res.json().catch(() => null)) as { event?: { id: string }; error?: string } | null
    setLoading(false)
    if (!res.ok || !data?.event) {
      setError(data?.error || ui.createFailed)
      return
    }
    router.push(`/dashboard/events/${data.event.id}/wizard`)
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-5" lang={locale}>
      <fieldset>
        <legend className="text-sm font-medium text-white/80">{ui.createWhat}</legend>
        <p className="mt-1 text-xs text-white/40">{ui.createHint}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {productOptions.map((option) => {
            const selected = products[option.id]
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setProducts((current) => toggleProduct(current, option.id))}
                className={`rounded-xl border px-3 py-3 text-start text-sm ${
                  selected
                    ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/15 bg-white/5 text-white/80'
                }`}
              >
                <span className="block font-medium">
                  {selected ? '✓ ' : ''}
                  {option.title}
                </span>
                <span className="text-xs text-white/40">{option.hint}</span>
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-white/80">{ui.localesLegend}</legend>
        <p className="mt-1 text-xs text-white/40">{ui.localesHint}</p>
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
        {ui.honoreeName}
        <input
          required
          value={honoreeName}
          onChange={(e) => setHonoreeName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>
      <label className="block text-sm">
        {ui.familyPrefix}
        <input
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>
      <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/50">
        <Link href="/dashboard/team" className="text-cyan-300 hover:text-cyan-200">
          {ui.team}
        </Link>
      </p>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-[#0b1020]"
      >
        {loading ? ui.creating : ui.createEvent}
      </button>
    </form>
  )
}
