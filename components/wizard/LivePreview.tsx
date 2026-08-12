'use client'

import { useEffect, useRef } from 'react'
import { EventSite } from '@/components/template/EventSite'
import type { EventConfig, WizardStepId } from '@/lib/platform/types'
import { WIZARD_STEPS } from '@/lib/platform/wizard'

export function LivePreview({
  config,
  step,
}: {
  config: EventConfig
  step: WizardStepId
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const target = WIZARD_STEPS.find((item) => item.id === step)?.previewTarget ?? 'hero'

  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const el = root.querySelector(`[data-preview="${target}"]`) as HTMLElement | null
    if (!el) return
    const top = el.offsetTop - 24
    root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [target, config.basics.honoreeName, config.branding.theme])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-white/50">
        <span>Preview ao vivo</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider">
          {config.domain.slug ? `/e/${config.domain.slug}` : 'rascunho'}
        </span>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto bg-black/30">
        <div className="origin-top scale-[0.92] md:scale-100">
          <EventSite config={config} highlight={step} mode="preview" />
        </div>
      </div>
    </div>
  )
}
