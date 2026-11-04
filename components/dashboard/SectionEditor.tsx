'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { WizardStepForm, type WizardStepFormHandle } from '@/components/wizard/WizardStepForm'
import { SECTION_LABELS, type SectionEditorId } from '@/lib/platform/section-editor'
import type { EventConfig, Guest, PlatformEvent } from '@/lib/platform/types'

export function SectionEditor({
  event,
  section,
}: {
  event: PlatformEvent
  section: SectionEditorId
}) {
  const [config, setConfig] = useState<EventConfig>(event.config)
  const [guests, setGuests] = useState<Guest[]>(event.guests)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error' | 'dirty'>('saved')
  const skipFirst = useRef(true)
  const formRef = useRef<WizardStepFormHandle>(null)
  const label = SECTION_LABELS[section]

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
        body: JSON.stringify({ config }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
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

  async function persistGuests(next: Guest[]) {
    setGuests(next)
    await fetch(`/api/platform/events/${event.id}/guests`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guests: next }),
    })
  }

  const statusLabel =
    saveState === 'saving'
      ? 'A guardar…'
      : saveState === 'error'
        ? 'Erro ao guardar'
        : saveState === 'dirty'
          ? 'Alterações por guardar'
          : 'Guardado'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/events/${event.id}`}
            className="text-xs text-white/40 hover:text-white"
          >
            ← Dashboard do evento
          </Link>
          <h1 className="font-display mt-2 text-3xl">Editar seção · {label}</h1>
          <p className="mt-1 text-sm text-white/50">
            {event.config.basics.honoreeName || 'Evento'} · alterações guardam automaticamente
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
          onGuests={(next) => void persistGuests(next)}
        />
      </div>
    </div>
  )
}
