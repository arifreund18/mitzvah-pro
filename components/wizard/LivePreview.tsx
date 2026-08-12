'use client'

import { useEffect, useRef } from 'react'
import { EventSite } from '@/components/template/EventSite'
import { EmailChrome, InvitationCard, SaveTheDateCard } from '@/components/template/EventEmails'
import { wizardUi } from '@/lib/platform/copy'
import { templateUi } from '@/lib/platform/template-copy'
import { eventPublicHostLabel } from '@/lib/platform/site-url'
import type { EventConfig, WizardStepId } from '@/lib/platform/types'
import { wizardSteps } from '@/lib/platform/wizard'

export function LivePreview({
  config,
  step,
}: {
  config: EventConfig
  step: WizardStepId
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const ui = wizardUi(config.locales.default)
  const mail = templateUi(config.locales.default)
  const target = wizardSteps(config.locales.default).find((item) => item.id === step)?.previewTarget ?? 'hero'
  const emailKind = step === 'saveTheDate' ? 'std' : step === 'invitation' ? 'invite' : null

  useEffect(() => {
    if (emailKind) return
    const root = scroller.current
    if (!root) return
    const el = root.querySelector(`[data-preview="${target}"]`) as HTMLElement | null
    if (!el) return
    const top = el.offsetTop - 24
    root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [target, emailKind, config.basics.honoreeName, config.branding.theme])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-white/50">
        <span>{emailKind ? mail.emailPreview : ui.livePreview}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider">
          {emailKind
            ? emailKind === 'std'
              ? mail.emailStd
              : mail.emailInvite
            : config.domain.slug
              ? eventPublicHostLabel(config.domain.slug)
              : ui.draft}
        </span>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto bg-black/30">
        {emailKind === 'std' ? (
          <EmailChrome kind="std" config={config}>
            <SaveTheDateCard config={config} />
          </EmailChrome>
        ) : emailKind === 'invite' ? (
          <EmailChrome kind="invite" config={config}>
            <InvitationCard config={config} />
          </EmailChrome>
        ) : (
          <div className="origin-top scale-[0.92] md:scale-100">
            <EventSite config={config} highlight={step} mode="preview" />
          </div>
        )}
      </div>
    </div>
  )
}
