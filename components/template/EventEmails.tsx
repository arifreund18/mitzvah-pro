import type { ReactNode } from 'react'
import { formatEventDate, typeLabel, wizardUi } from '@/lib/platform/copy'
import { templateUi } from '@/lib/platform/template-copy'
import { THEME_PRESETS } from '@/components/template/EventSite'
import type { EventConfig } from '@/lib/platform/types'

export function SaveTheDateCard({
  config,
  ctaHref,
}: {
  config: EventConfig
  ctaHref?: string
}) {
  const theme = THEME_PRESETS[config.branding.theme]
  const accent = config.branding.accentColor || '#22d3ee'
  const locale = config.locales.default
  const ui = templateUi(locale)
  const name = config.basics.honoreeName || wizardUi(locale).site.honoreeFallback
  const dateLabel = formatEventDate(config.basics.date, locale, wizardUi(locale).site.dateTbd)
  const place = [config.basics.city, config.basics.country].filter(Boolean).join(', ')

  return (
    <div
      className="relative mx-auto max-w-md overflow-hidden rounded-2xl px-8 py-10 text-center shadow-2xl"
      style={{ background: theme.inviteBg, color: theme.inviteText }}
    >
      <div
        className="absolute inset-x-0 top-0 h-14"
        style={{
          background: `repeating-linear-gradient(135deg, ${accent}33 0 12px, transparent 12px 24px)`,
        }}
      />
      <p className="relative mt-4 text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>
        Save the Date
      </p>
      <p className="font-display relative mt-5 text-4xl">{name}</p>
      <p className="relative mt-2 text-sm opacity-70">{typeLabel(config.basics.type, locale)}</p>
      <p className="relative mt-6 text-sm leading-relaxed">{config.saveTheDate.message}</p>
      <p className="relative mt-4 text-sm font-semibold">
        {dateLabel}
        {place ? ` · ${place}` : ''}
      </p>
      <p className="relative mt-8 text-xs uppercase tracking-widest opacity-60">
        {config.saveTheDate.envelopeLabel}
      </p>
      {ctaHref ? (
        <a
          href={ctaHref}
          className="relative mt-6 inline-block rounded-full px-6 py-2 text-sm font-semibold text-black"
          style={{ background: accent }}
        >
          {ui.viewWebsite}
        </a>
      ) : null}
    </div>
  )
}

export function InvitationCard({
  config,
  ctaHref,
}: {
  config: EventConfig
  ctaHref?: string
}) {
  const theme = THEME_PRESETS[config.branding.theme]
  const accent = config.branding.accentColor || '#22d3ee'
  const locale = config.locales.default
  const ui = templateUi(locale)
  const name = config.basics.honoreeName || wizardUi(locale).site.honoreeFallback

  return (
    <div
      className="relative mx-auto max-w-lg rounded-[2rem] px-10 py-12 text-center shadow-2xl"
      style={{ background: theme.inviteBg, color: theme.inviteText }}
    >
      <div
        className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold uppercase tracking-wider text-black shadow-lg"
        style={{ background: config.invitation.sealImageUrl ? theme.inviteBg : accent }}
      >
        {config.invitation.sealImageUrl ? (
          <img
            src={config.invitation.sealImageUrl}
            alt={config.invitation.sealLabel || ''}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          config.invitation.sealLabel || 'Mitzvah'
        )}
      </div>
      <p className="mt-6 text-sm italic opacity-80">{config.invitation.greeting}</p>
      <h2 className="font-display mt-4 text-4xl">{name}</h2>
      <p className="mt-4 leading-relaxed">{config.invitation.body}</p>
      <p className="mt-8 text-sm font-semibold">{config.invitation.hostLine}</p>
      {ctaHref ? (
        <a
          href={ctaHref}
          className="mt-8 inline-block rounded-full px-6 py-2 text-sm font-semibold text-black"
          style={{ background: accent }}
        >
          {ui.confirmRsvp}
        </a>
      ) : null}
    </div>
  )
}

export function EmailChrome({
  kind,
  config,
  children,
}: {
  kind: 'std' | 'invite'
  config: EventConfig
  children: ReactNode
}) {
  const ui = templateUi(config.locales.default)
  const name = config.basics.honoreeName || 'Mitzvah.pro'
  const subject =
    kind === 'std' ? `Save the Date — ${name}` : `${typeLabel(config.basics.type, config.locales.default)} — ${name}`

  return (
    <div className="min-h-full bg-[#1a2033] px-4 py-8">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0e1424] text-white shadow-2xl">
        <div className="border-b border-white/10 px-4 py-3 text-xs text-white/50">
          <p>
            {ui.emailPreview} · {kind === 'std' ? ui.emailStd : ui.emailInvite}
          </p>
          <p className="mt-1 text-white/70">{ui.toGuests}</p>
          <p className="mt-2 font-medium text-white">{subject}</p>
        </div>
        <div className="bg-[#cfc6b4] px-4 py-10">{children}</div>
      </div>
    </div>
  )
}
