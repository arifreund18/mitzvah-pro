'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LOCALE_OPTIONS } from '@/lib/platform/locales'
import { applyProducts, normalizeProducts, toggleProduct } from '@/lib/platform/products'
import { studioUi } from '@/lib/platform/studio-ui'
import type { EventConfig, EventLocale, EventProducts, PlatformEvent } from '@/lib/platform/types'

export function EventOptionsPanel({
  event,
  locale = 'en',
}: {
  event: PlatformEvent
  locale?: EventLocale
}) {
  const router = useRouter()
  const ui = studioUi(locale)
  const [config, setConfig] = useState<EventConfig>(event.config)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'err'>('ok')

  const products = normalizeProducts(
    config.products,
    config.productMode,
    config.saveTheDate?.enabled,
  )
  const enabledLocales = config.locales.enabled.length
    ? config.locales.enabled
    : ([config.locales.default] as EventLocale[])

  const productOptions: { id: keyof EventProducts; title: string; hint: string }[] = [
    { id: 'site', title: ui.productSite, hint: ui.productSiteHint },
    { id: 'invitation', title: ui.productInvite, hint: ui.productInviteHint },
    { id: 'saveTheDate', title: ui.productStd, hint: ui.productStdHint },
  ]

  async function persist(next: EventConfig) {
    setConfig(next)
    setBusy(true)
    setMessage('')
    const res = await fetch(`/api/platform/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: next }),
    })
    setBusy(false)
    if (!res.ok) {
      setTone('err')
      setMessage(ui.optionsSaveFailed)
      return
    }
    setTone('ok')
    setMessage(ui.optionsSaved)
    router.refresh()
  }

  function onToggleProduct(id: keyof EventProducts) {
    void persist(applyProducts(config, toggleProduct(products, id)))
  }

  function onToggleLocale(nextLocale: EventLocale) {
    const selected = enabledLocales.includes(nextLocale)
    let nextEnabled: EventLocale[]
    if (selected) {
      if (enabledLocales.length === 1) return
      nextEnabled = enabledLocales.filter((item) => item !== nextLocale)
    } else {
      nextEnabled = [...enabledLocales, nextLocale]
    }
    const nextDefault = nextEnabled.includes(config.locales.default)
      ? config.locales.default
      : nextEnabled[0]
    void persist({
      ...config,
      locales: { default: nextDefault, enabled: nextEnabled },
    })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-display text-2xl">{ui.optionsTitle}</h2>
      <p className="mt-2 text-sm text-white/50">{ui.optionsHint}</p>

      <p className="mt-5 text-xs uppercase tracking-wide text-white/40">{ui.products}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {productOptions.map((option) => {
          const selected = products[option.id]
          return (
            <button
              key={option.id}
              type="button"
              disabled={busy}
              onClick={() => onToggleProduct(option.id)}
              className={`rounded-xl border px-3 py-3 text-start text-sm disabled:opacity-50 ${
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

      <p className="mt-6 text-xs uppercase tracking-wide text-white/40">{ui.languages}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LOCALE_OPTIONS.map((option) => {
          const selected = enabledLocales.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              disabled={busy}
              onClick={() => onToggleLocale(option.value)}
              className={`rounded-xl border px-3 py-2 text-sm disabled:opacity-50 ${
                selected
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100'
                  : 'border-white/15 bg-white/5 text-white/70'
              }`}
            >
              {selected ? '✓ ' : ''}
              {option.label}
              {config.locales.default === option.value ? ' ★' : ''}
            </button>
          )
        })}
      </div>
      {message ? (
        <p className={`mt-4 text-sm ${tone === 'err' ? 'text-rose-300' : 'text-cyan-200'}`}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
