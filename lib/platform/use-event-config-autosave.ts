'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { EventConfig, Guest, PlatformEvent, WizardStepId } from '@/lib/platform/types'

type SaveState = 'saved' | 'saving' | 'error' | 'dirty'

type AutosaveBody = {
  config: EventConfig
  expectedUpdatedAt: string
  wizard?: { currentStep: WizardStepId; completedSteps: WizardStepId[] }
}

/**
 * Debounced PATCH of event config that never discards local keystrokes on 409.
 * Overlapping saves used to call setConfig(server.config), which restored the
 * previous value and made deletions (backspace) look impossible while appends worked.
 */
export function useEventConfigAutosave(opts: {
  eventId: string
  config: EventConfig
  initialUpdatedAt: string
  /** When set, included in the PATCH body (wizard studio). */
  wizard?: { currentStep: WizardStepId; completedSteps: () => WizardStepId[] }
  onGuestsFromServer?: (guests: Guest[]) => void
}): {
  saveState: SaveState
  setSaveState: (s: SaveState) => void
  updatedAtRef: MutableRefObject<string>
  markDirty: () => void
} {
  const { eventId, config, initialUpdatedAt, wizard, onGuestsFromServer } = opts
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const skipFirst = useRef(true)
  const updatedAtRef = useRef(initialUpdatedAt)
  const configRef = useRef(config)
  configRef.current = config
  const wizardRef = useRef(wizard)
  wizardRef.current = wizard
  const onGuestsRef = useRef(onGuestsFromServer)
  onGuestsRef.current = onGuestsFromServer
  /** Bumps on every scheduled save; in-flight responses for older seq are ignored. */
  const saveSeq = useRef(0)

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    setSaveState('saving')
    const seq = ++saveSeq.current
    const handle = window.setTimeout(async () => {
      const maxAttempts = 3
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (seq !== saveSeq.current) return
        const body: AutosaveBody = {
          config: configRef.current,
          expectedUpdatedAt: updatedAtRef.current,
        }
        const w = wizardRef.current
        if (w) {
          body.wizard = {
            currentStep: w.currentStep,
            completedSteps: w.completedSteps(),
          }
        }
        const res = await fetch(`/api/platform/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (seq !== saveSeq.current) return
        const data = (await res.json().catch(() => null)) as
          | { event?: PlatformEvent; code?: string }
          | null
        if (res.ok) {
          if (data?.event?.updatedAt) updatedAtRef.current = data.event.updatedAt
          if (seq === saveSeq.current) setSaveState('saved')
          return
        }
        if (res.status === 409 && data?.event) {
          // Keep local config — only refresh the concurrency token and retry.
          updatedAtRef.current = data.event.updatedAt
          if (Array.isArray(data.event.guests)) {
            onGuestsRef.current?.(data.event.guests)
          }
          continue
        }
        if (seq === saveSeq.current) setSaveState('error')
        return
      }
      if (seq === saveSeq.current) setSaveState('error')
    }, 450)
    return () => window.clearTimeout(handle)
  }, [config, eventId, wizard?.currentStep])

  return {
    saveState,
    setSaveState,
    updatedAtRef,
    markDirty: () => setSaveState('dirty'),
  }
}
