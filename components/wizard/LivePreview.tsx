'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { EventSite } from '@/components/template/EventSite'
import {
  EmailChrome,
  InvitationCard,
  SaveTheDateCard,
} from '@/components/template/EventEmails'
import { EnvelopeClient } from '@/lib/event-cards'
import { wizardUi } from '@/lib/platform/copy'
import { localizedOpenLabel, primaryEventLocale } from '@/lib/platform/guest-locale'
import { openEnvelopeLabel } from '@/lib/platform/guest-ui'
import { mailHtml } from '@/lib/platform/mail'
import { normalizeGuest } from '@/lib/platform/normalize-guest'
import {
  mailReminderHtml,
  mailReminderSubject,
  previewReminderDays,
} from '@/lib/platform/reminder-mail'
import { templateUi } from '@/lib/platform/template-copy'
import { eventPublicHostLabel } from '@/lib/platform/site-url'
import type { EventConfig, WizardStepId } from '@/lib/platform/types'
import { wizardSteps } from '@/lib/platform/wizard'

type InvitePreviewTab = 'email' | 'invite'
type EmailPreviewKind = 'std' | 'invite' | 'reminder'

export function LivePreview({
  config,
  step,
}: {
  config: EventConfig
  step: WizardStepId
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [previewHost, setPreviewHost] = useState('localhost:3000')
  const [inviteTab, setInviteTab] = useState<InvitePreviewTab>('email')
  const locale = primaryEventLocale(config)
  const ui = wizardUi(locale)
  const mail = templateUi(locale)
  const target =
    wizardSteps(locale, config).find((item) => item.id === step)?.previewTarget ??
    'hero'
  const emailKind: EmailPreviewKind | null =
    step === 'saveTheDate'
      ? 'std'
      : step === 'invitation'
        ? 'invite'
        : step === 'reminders'
          ? 'reminder'
          : null

  const previewGuest = useMemo(
    () =>
      normalizeGuest({
        familyName: config.basics.familyName || config.basics.honoreeName || 'Guest',
        email: 'preview@mitzvah.pro',
        token: 'PREVIEW',
        inviteLocale: locale,
      }),
    [config.basics.familyName, config.basics.honoreeName, locale],
  )

  const reminderDays = useMemo(
    () => previewReminderDays(config.reminders),
    [config.reminders],
  )

  const inviteMailSrcDoc = useMemo(() => {
    if (emailKind !== 'invite') return ''
    return mailHtml('invite', config, previewHost, previewGuest)
  }, [emailKind, config, previewGuest, previewHost])

  const reminderMailSrcDoc = useMemo(() => {
    if (emailKind !== 'reminder') return ''
    return mailReminderHtml(config, previewHost, previewGuest, reminderDays)
  }, [emailKind, config, previewGuest, previewHost, reminderDays])

  const reminderSubject = useMemo(() => {
    if (emailKind !== 'reminder') return ''
    return mailReminderSubject(config, previewGuest, reminderDays)
  }, [emailKind, config, previewGuest, reminderDays])

  const inviteDesign = config.invitation.design
  const sealUrl = inviteDesign.sealUrl || config.invitation.sealImageUrl

  useEffect(() => {
    setPreviewHost(window.location.host)
  }, [])

  useEffect(() => {
    setInviteTab('email')
  }, [step])

  useEffect(() => {
    if (emailKind) return
    const root = scroller.current
    if (!root) return
    const el = root.querySelector(`[data-preview="${target}"]`) as HTMLElement | null
    if (!el) return
    const top = el.offsetTop - 24
    root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [target, emailKind, config.basics.honoreeName, config.branding.theme])

  const headerLabel =
    emailKind === 'invite'
      ? inviteTab === 'email'
        ? mail.emailInvite
        : mail.inviteCard
      : emailKind === 'std'
        ? mail.emailStd
        : emailKind === 'reminder'
          ? mail.emailReminder
          : config.domain.slug
            ? eventPublicHostLabel(config.domain.slug)
            : ui.draft

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-xs text-white/50">
        {emailKind === 'invite' ? (
          <div
            role="tablist"
            aria-label={mail.emailPreview}
            className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={inviteTab === 'email'}
              className={`rounded-md px-2.5 py-1 transition ${
                inviteTab === 'email'
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
              onClick={() => setInviteTab('email')}
            >
              {mail.emailPreview}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inviteTab === 'invite'}
              className={`rounded-md px-2.5 py-1 transition ${
                inviteTab === 'invite'
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
              onClick={() => setInviteTab('invite')}
            >
              {mail.invitePreview}
            </button>
          </div>
        ) : (
          <span>{emailKind ? mail.emailPreview : ui.livePreview}</span>
        )}
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider">
          {headerLabel}
        </span>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto bg-black/30">
        {emailKind === 'std' ? (
          <EmailChrome kind="std" config={config}>
            <SaveTheDateCard config={config} />
          </EmailChrome>
        ) : emailKind === 'reminder' ? (
          <div className="min-h-full bg-[#1a2033] px-4 py-8">
            <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0e1424] text-white shadow-2xl">
              <div className="border-b border-white/10 px-4 py-3 text-xs text-white/50">
                <p>
                  {mail.emailPreview} · {mail.emailReminder}
                </p>
                <p className="mt-1 text-white/70">{mail.toGuests}</p>
                {reminderSubject ? (
                  <p className="mt-2 font-medium text-white">{reminderSubject}</p>
                ) : null}
              </div>
              <iframe
                key={`reminder-${reminderDays}-${reminderSubject}-${config.reminders.message}`}
                title={mail.emailReminder}
                className="block h-[760px] w-full border-0 bg-white"
                srcDoc={reminderMailSrcDoc}
              />
            </div>
          </div>
        ) : emailKind === 'invite' && inviteTab === 'email' ? (
          <div className="min-h-full bg-[#1a2033] px-4 py-8">
            <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0e1424] text-white shadow-2xl">
              <div className="border-b border-white/10 px-4 py-3 text-xs text-white/50">
                <p>
                  {mail.emailPreview} · {mail.emailInvite}
                </p>
                <p className="mt-1 text-white/70">{mail.toGuests}</p>
              </div>
              <iframe
                key={`invite-${inviteMailSrcDoc.length}-${config.invitation.body}`}
                title={mail.emailInvite}
                className="block h-[760px] w-full border-0 bg-white"
                srcDoc={inviteMailSrcDoc}
              />
            </div>
          </div>
        ) : emailKind === 'invite' ? (
          <EnvelopeClient
            config={{
              ...inviteDesign,
              sealUrl,
              sealLabel: inviteDesign.sealLabel || config.invitation.sealLabel,
              openLabel: localizedOpenLabel(
                config,
                locale,
                'invite',
                openEnvelopeLabel('invite', locale),
              ),
            }}
          >
            <InvitationCard
              config={config}
              design={inviteDesign}
              locale={locale}
              guestName={previewGuest.familyName}
            />
          </EnvelopeClient>
        ) : (
          <div className="origin-top scale-[0.92] md:scale-100">
            <EventSite config={config} highlight={step} mode="preview" />
          </div>
        )}
      </div>
    </div>
  )
}
