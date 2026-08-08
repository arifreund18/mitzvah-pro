'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'

const CONTACT_API = '/BarBeni/api/platform/contact'

export function PlatformContactForm() {
  const t = useTranslations('contact.form')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)
    const res = await fetch(CONTACT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        email: form.get('email'),
        message: form.get('message'),
      }),
    })
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null
    setLoading(false)
    if (!res.ok || !data?.ok) {
      setError(t('error'))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-8 text-center text-emerald-200">
        {t('sent')}
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        name="name"
        required
        placeholder={t('name')}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-cyan-400/60"
      />
      <input
        name="email"
        type="email"
        required
        placeholder={t('email')}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-cyan-400/60"
      />
      <textarea
        name="message"
        required
        minLength={10}
        placeholder={t('message')}
        className="min-h-32 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-cyan-400/60"
      />
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? t('sending') : t('send')}
      </Button>
    </form>
  )
}
