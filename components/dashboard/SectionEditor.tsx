'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { WizardStepForm, type WizardStepFormHandle } from '@/components/wizard/WizardStepForm'
import type { SectionEditorId } from '@/lib/platform/section-editor'
import { fillTemplate, sectionLabelsFor, studioUi } from '@/lib/platform/studio-ui'
import type { EventConfig, Guest, PlatformEvent } from '@/lib/platform/types'

export function SectionEditor({
  event,
  section,
}: {
  event: PlatformEvent
  section: SectionEditorId
}) {
  const locale = event.config.locales.default
  const ui = studioUi(locale)
  const label = sectionLabelsFor(locale)[section]
  const [config, setConfig] = useState<EventConfig>(event.config)
  const [guests, setGuests] = useState<Guest[]>(event.guests)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error' | 'dirty'>('saved')
  const skipFirst = useRef(true)
  const formRef = useRef<WizardStepFormHandle>(null)
  const updatedAtRef = useRef(event.updatedAt)

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    setSaveState('saving')
    const handle = window.setTimeout(async () => {
      const res = await fetch(`/api/platform/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, expectedUpdatedAt: updatedAtRef.current }),
      })
      const data = (await res.json().catch(() => null)) as
        | { event?: PlatformEvent }
        | null
      if (!res.ok) {
        if (res.status === 409 && data?.event) {
          setConfig(data.event.config)
          updatedAtRef.current = data.event.updatedAt
          setGuests(data.event.guests)
        }
        setSaveState('error')
        return
      }
      if (data?.event?.updatedAt) updatedAtRef.current = data.event.updatedAt
      setSaveState('saved')
    }, 450)
    return () => window.clearTimeout(handle)
  }, [config, event.id])

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (saveState === 'saving' || saveState === 'dirty') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveState])

  async function persistGuests(next: Guest[], opts?: { persist?: boolean }) {
    setGuests(next)
    if (opts?.persist === false) return
    const res = await fetch(`/api/platform/events/${event.id}/guests`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guests: next }),
    })
    if (!res.ok) {
      await reloadGuestsFromServer()
      setSaveState('error')
    }
  }

  async function reloadGuestsFromServer() {
    const res = await fetch(`/api/platform/events/${event.id}/guests`)
    const data = (await res.json().catch(() => null)) as { guests?: Guest[] } | null
    if (res.ok && Array.isArray(data?.guests)) {
      setGuests(data.guests)
    }
  }

  const statusLabel =
    saveState === 'saving'
      ? ui.saving
      : saveState === 'error'
        ? ui.saveError
        : saveState === 'dirty'
          ? ui.dirty
          : ui.saved

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" lang={locale}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/events/${event.id}`}
            className="text-xs text-white/40 hover:text-white"
          >
            {ui.backToEvent}
          </Link>
          <h1 className="font-display mt-2 text-3xl">
            {fillTemplate(ui.editSectionTitle, { label })}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {event.config.basics.honoreeName || ui.unnamed}
          </p>
        </div>
        <p
          className={`text-xs ${
            saveState === 'error'
              ? 'text-rose-300'
              : saveState === 'saving'
                ? 'text-amber-200'
                : 'text-cyan-200/80'
          }`}
        >
          {statusLabel}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <WizardStepForm
          ref={formRef}
          step={section}
          config={config}
          guests={guests}
          eventId={event.id}
          onChange={(next) => {
            setSaveState('dirty')
            setConfig(next)
          }}
          onGuests={(next, opts) => void persistGuests(next, opts)}
          onGuestsReload={reloadGuestsFromServer}
        />
      </div>
    </div>
  )
}
