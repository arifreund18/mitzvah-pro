'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LOCALE_OPTIONS } from '@/lib/platform/locales'
import { applyProducts, normalizeProducts, toggleProduct } from '@/lib/platform/products'
import type { EventConfig, EventLocale, EventProducts, PlatformEvent } from '@/lib/platform/types'

const PRODUCT_OPTIONS: { id: keyof EventProducts; title: string; hint: string }[] = [
  {
    id: 'site',
    title: 'Site',
    hint: 'Páginas do evento: história, programação, hotéis, FAQ.',
  },
  {
    id: 'invitation',
    title: 'Convite',
    hint: 'Email de convite, RSVP e lista de convidados.',
  },
  {
    id: 'saveTheDate',
    title: 'Save the Date',
    hint: 'Aviso antecipado por email para reservar a data.',
  },
]

export function EventOptionsPanel({ event }: { event: PlatformEvent }) {
  const router = useRouter()
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
      setMessage('Não foi possível guardar as opções')
      return
    }
    setTone('ok')
    setMessage('Opções atualizadas')
    router.refresh()
  }

  function onToggleProduct(id: keyof EventProducts) {
    void persist(applyProducts(config, toggleProduct(products, id)))
  }

  function onToggleLocale(locale: EventLocale) {
    const selected = enabledLocales.includes(locale)
    let nextEnabled: EventLocale[]
    if (selected) {
      if (enabledLocales.length === 1) return
      nextEnabled = enabledLocales.filter((item) => item !== locale)
    } else {
      nextEnabled = [...enabledLocales, locale]
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
      <h2 className="font-display text-2xl">Opções do evento</h2>
      <p className="mt-2 text-sm text-white/50">
        Altere o que o evento inclui e os idiomas. O wizard e os envios adaptam-se a estas escolhas.
      </p>

      <p className="mt-5 text-xs uppercase tracking-wide text-white/40">Produtos</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {PRODUCT_OPTIONS.map((option) => {
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

      <p className="mt-6 text-xs uppercase tracking-wide text-white/40">Idiomas</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LOCALE_OPTIONS.map((option) => {
          const selected = enabledLocales.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              disabled={busy}
              onClick={() => onToggleLocale(option.value)}
              className={`rounded-xl border px-3 py-3 text-start text-sm disabled:opacity-50 ${
                selected
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100'
                  : 'border-white/15 bg-white/5 text-white/80'
              }`}
            >
              <span className="block font-medium">
                {selected ? '✓ ' : ''}
                {option.label}
              </span>
            </button>
          )
        })}
      </div>

      {message ? (
        <p className={`mt-3 text-sm ${tone === 'err' ? 'text-rose-300' : 'text-cyan-200'}`}>{message}</p>
      ) : null}
    </div>
  )
}
