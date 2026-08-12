'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LivePreview } from '@/components/wizard/LivePreview'
import { WizardStepForm, type WizardStepFormHandle } from '@/components/wizard/WizardStepForm'
import { wizardUi } from '@/lib/platform/copy'
import { adjacentStep, normalizeWizardStep, reviewIssues, wizardSteps } from '@/lib/platform/wizard'
import type { EventConfig, Guest, PlatformEvent, WizardStepId } from '@/lib/platform/types'
import { cn } from '@/lib/utils'

export function WizardStudio({ event }: { event: PlatformEvent }) {
  const router = useRouter()
  const [config, setConfig] = useState<EventConfig>(event.config)
  const [guests, setGuests] = useState<Guest[]>(event.guests)
  const [step, setStep] = useState<WizardStepId>(normalizeWizardStep(event.wizard.currentStep))
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form')
  const [publishError, setPublishError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const completed = useRef(new Set<WizardStepId>(event.wizard.completedSteps.map(normalizeWizardStep)))
  const skipFirst = useRef(true)
  const stepForm = useRef<WizardStepFormHandle>(null)

  const ui = wizardUi(config.locales.default)
  const steps = wizardSteps(config.locales.default)
  const def = steps.find((item) => item.id === step) ?? steps[0]
  const issues = useMemo(() => reviewIssues(config), [config])
  const prev = adjacentStep(step, -1)
  const next = adjacentStep(step, 1)
  const dir = config.locales.default === 'he' ? 'rtl' : 'ltr'

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    setSaveState('saving')
    const handle = window.setTimeout(async () => {
      completed.current.add(step)
      const res = await fetch(`/api/platform/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          wizard: { currentStep: step, completedSteps: [...completed.current] },
        }),
      })
      if (!res.ok) {
        setSaveState('error')
        return
      }
      setSaveState('saved')
    }, 450)
    return () => window.clearTimeout(handle)
  }, [config, step, event.id])

  function goToStep(nextStep: WizardStepId) {
    stepForm.current?.flushPending()
    setStep(nextStep)
  }

  async function persistGuests(nextGuests: Guest[]) {
    setGuests(nextGuests)
    await fetch(`/api/platform/events/${event.id}/guests`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guests: nextGuests }),
    })
  }

  async function publish() {
    setPublishing(true)
    setPublishError('')
    await fetch(`/api/platform/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config,
        wizard: { currentStep: 'review', completedSteps: [...completed.current, 'review'] },
      }),
    })
    const res = await fetch(`/api/platform/events/${event.id}/publish`, { method: 'POST' })
    const data = (await res.json().catch(() => null)) as { error?: string; event?: PlatformEvent } | null
    setPublishing(false)
    if (!res.ok) {
      setPublishError(data?.error || 'Não foi possível publicar')
      return
    }
    router.push(`/e/${data?.event?.slug || config.domain.slug}`)
    router.refresh()
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[#070b16] text-white lg:h-screen lg:overflow-hidden"
      lang={config.locales.default}
      dir={dir}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <Link href="/dashboard" className="text-xs text-white/40 hover:text-white">
            ← {ui.dashboard}
          </Link>
          <h1 className="font-display text-lg">
            Wizard · {config.basics.honoreeName || ui.newEvent}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span
            className={cn(
              'rounded-full px-2 py-1',
              saveState === 'saved' && 'bg-emerald-400/15 text-emerald-200',
              saveState === 'saving' && 'bg-white/10 text-white/60',
              saveState === 'error' && 'bg-rose-400/15 text-rose-200',
            )}
          >
            {saveState === 'saved' ? ui.saved : saveState === 'saving' ? ui.saving : ui.saveError}
          </span>
          <div className="flex rounded-lg bg-white/10 p-1 lg:hidden">
            <button
              type="button"
              className={cn('rounded-md px-3 py-1', mobileTab === 'form' && 'bg-white/15')}
              onClick={() => setMobileTab('form')}
            >
              {ui.edit}
            </button>
            <button
              type="button"
              className={cn('rounded-md px-3 py-1', mobileTab === 'preview' && 'bg-white/15')}
              onClick={() => setMobileTab('preview')}
            >
              {ui.viewSite}
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-e border-white/10 p-3 md:block">
          <ol className="space-y-1">
            {steps.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goToStep(item.id)}
                  className={cn(
                    'w-full rounded-xl px-3 py-2 text-start text-sm',
                    item.id === step ? 'bg-cyan-400/15 text-cyan-100' : 'text-white/60 hover:bg-white/5',
                  )}
                >
                  <span className="me-2 text-xs text-white/30">{index + 1}</span>
                  {item.title}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <section
          className={cn(
            'flex w-full min-w-0 flex-col border-white/10 lg:w-[42%] lg:border-e',
            mobileTab === 'preview' && 'hidden lg:flex',
          )}
        >
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">
              {ui.stepOf
                .replace('{n}', String(steps.findIndex((item) => item.id === step) + 1))
                .replace('{total}', String(steps.length))}
            </p>
            <h2 className="font-display mt-1 text-2xl">{def.title}</h2>
            <p className="mt-1 text-sm text-white/50">{def.subtitle}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <WizardStepForm
              ref={stepForm}
              step={step}
              config={config}
              guests={guests}
              onChange={setConfig}
              onGuests={persistGuests}
            />
            {step === 'review' && (
              <div className="mt-6 space-y-3">
                {publishError ? <p className="text-sm text-rose-300">{publishError}</p> : null}
                <button
                  type="button"
                  disabled={publishing || issues.length > 0}
                  onClick={publish}
                  className="w-full rounded-full bg-cyan-400 py-3 font-semibold text-[#0b1020] disabled:opacity-40"
                >
                  {publishing ? ui.publishing : ui.publish}
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
            <button
              type="button"
              disabled={!prev}
              onClick={() => prev && goToStep(prev)}
              className="rounded-full border border-white/15 px-4 py-2 text-sm disabled:opacity-30"
            >
              {ui.back}
            </button>
            <select
              className="max-w-[40%] rounded-lg border border-white/15 bg-[#12182a] px-2 py-2 text-sm text-white md:hidden"
              value={step}
              onChange={(e) => goToStep(e.target.value as WizardStepId)}
              style={{ colorScheme: 'dark', backgroundColor: '#12182a', color: '#fff' }}
            >
              {steps.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!next}
              onClick={() => next && goToStep(next)}
              className="rounded-full bg-white/10 px-4 py-2 text-sm disabled:opacity-30"
            >
              {ui.continue}
            </button>
          </div>
        </section>

        <section
          className={cn(
            'min-h-0 min-w-0 flex-1',
            mobileTab === 'form' && 'hidden lg:block',
          )}
        >
          <LivePreview config={config} step={step} />
        </section>
      </div>
    </div>
  )
}
