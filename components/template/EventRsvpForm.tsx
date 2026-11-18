'use client'

import { useState } from 'react'
import { publicRsvpCopy } from '@/lib/platform/guest-ui'
import { isRsvpDeadlinePassed } from '@/lib/platform/rsvp-deadline'
import { siteFieldClass, siteSelectClass } from '@/lib/platform/site-form'
import type { EventConfig, EventLocale, PlatformEvent } from '@/lib/platform/types'

export function EventRsvpForm({
  event,
  locale,
}: {
  event: PlatformEvent
  locale?: EventLocale
}) {
  const config: EventConfig = event.config
  const lang = locale || config.locales.default || 'pt'
  const ui = publicRsvpCopy(lang)
  const dir = lang === 'he' ? 'rtl' : 'ltr'
  const themeId = config.branding.theme
  const fieldClass = siteFieldClass(themeId)
  const selectClass = siteSelectClass(themeId)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const closed = isRsvpDeadlinePassed(config.rsvp.deadline)

  if (!config.rsvp.publicFormEnabled && !config.rsvp.openRsvpDefault) {
    return (
      <p
        className="rounded-2xl border border-white/15 bg-white/5 px-6 py-8 text-center text-white/70"
        dir={dir}
      >
        {ui.personalLinkOnly}
      </p>
    )
  }

  if (closed) {
    return (
      <p
        className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-8 text-center"
        dir={dir}
      >
        {ui.deadlineClosed}
      </p>
    )
  }

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
      setError(data?.error || ui.error)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <p
        className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-8 text-center text-emerald-100"
        dir={dir}
      >
        {config.rsvp.confirmationMessage?.trim() || ui.thanks}
      </p>
    )
  }

  return (
    <form id="rsvp-form" onSubmit={onSubmit} className="space-y-4 text-left" dir={dir}>
      <label className="block text-sm">
        {ui.familyName}
        <input name="familyName" required className={fieldClass} />
      </label>
      <label className="block text-sm">
        {ui.email}
        <input name="email" type="email" className={fieldClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          {ui.people}
          <input
            name="partySize"
            type="number"
            min={1}
            defaultValue={1}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          {ui.status}
          <select name="status" defaultValue="yes" className={selectClass}>
            <option value="yes">{ui.yes}</option>
            <option value="no">{ui.no}</option>
            <option value="pending">{ui.pending}</option>
          </select>
        </label>
      </div>
      {config.rsvp.collectMeal ? (
        <label className="block text-sm">
          {ui.meal}
          <select
            name="meal"
            className={selectClass}
            defaultValue={config.rsvp.meals[0] || ''}
          >
            {config.rsvp.meals.map((meal) => (
              <option key={meal} value={meal}>
                {meal}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {config.rsvp.collectDietary ? (
        <label className="block text-sm">
          {ui.dietary}
          <input name="dietary" className={fieldClass} />
        </label>
      ) : null}
      <label className="block text-sm">
        {ui.message}
        <textarea name="message" rows={3} className={fieldClass} />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full px-6 py-3 font-semibold text-[#0b1020] disabled:opacity-50"
        style={{ background: config.branding.accentColor || '#22d3ee' }}
      >
        {loading ? ui.submitting : ui.submit}
      </button>
    </form>
  )
}
