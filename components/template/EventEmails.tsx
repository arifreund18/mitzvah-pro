import type { CSSProperties, ReactNode } from 'react'
import { formatEventDate, typeLabel, wizardUi } from '@/lib/platform/copy'
import { templateUi } from '@/lib/platform/template-copy'
import { THEME_PRESETS } from '@/components/template/theme-presets'
import type { CardDesign, EventConfig, EventLocale } from '@/lib/platform/types'

function fontStack(fontKey?: string, locale?: EventLocale): string {
  if (locale === 'he') return '"Noto Sans Hebrew", Arial, sans-serif'
  const map: Record<string, string> = {
    georgia: 'Georgia, "Times New Roman", serif',
    playfair: '"Playfair Display", Georgia, serif',
    cormorant: '"Cormorant Garamond", Georgia, serif',
    lato: 'Lato, Helvetica, Arial, sans-serif',
    montserrat: 'Montserrat, Helvetica, Arial, sans-serif',
  }
  return map[fontKey || ''] || map.georgia
}

function cardShellStyle(design: CardDesign | undefined, fallbackBg: string, fallbackText: string): CSSProperties {
  return {
    background: design?.cardColor || fallbackBg,
    color: design?.cardTextColor || fallbackText,
    fontFamily: fontStack(design?.fontKey),
    backgroundImage: design?.cardImageUrl ? `url(${design.cardImageUrl})` : undefined,
    backgroundSize: design?.cardImageUrl ? 'cover' : undefined,
  }
}

export function SaveTheDateCard({
  config,
  ctaHref,
  design,
  locale: localeProp,
}: {
  config: EventConfig
  ctaHref?: string
  design?: CardDesign
  locale?: EventLocale
}) {
  const theme = THEME_PRESETS[config.branding.theme]
  const accent = config.branding.accentColor || '#22d3ee'
  const locale = localeProp || config.locales.default
  const ui = templateUi(locale)
  const d = design || config.saveTheDate.design
  const name = d.eventName || config.basics.honoreeName || wizardUi(locale).site.honoreeFallback
  const dateLabel =
    d.dateLabel || formatEventDate(config.basics.date, locale, wizardUi(locale).site.dateTbd)
  const place =
    d.cityLabel || [config.basics.city, config.basics.country].filter(Boolean).join(', ')
  const cta = d.ctaView || ui.viewWebsite

  return (
    <div
      className="relative mx-auto max-w-md overflow-hidden rounded-2xl px-8 py-10 text-center shadow-2xl"
      style={cardShellStyle(d, theme.inviteBg, theme.inviteText)}
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      {d.panelPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={d.panelPhotoUrl}
          alt=""
          className={`mx-auto mb-4 object-cover ${
            d.panelPhotoShape === 'rectangle' ? 'h-28 w-40 rounded-xl' : 'h-24 w-24 rounded-full'
          }`}
        />
      ) : null}
      <p
        className="relative mt-2 text-xs uppercase tracking-[0.35em]"
        style={{ color: d.headingColor || accent, fontSize: d.headingSizePx ? d.headingSizePx * 0.4 : undefined, fontWeight: d.headingBold ? 700 : 500 }}
      >
        {d.heading || d.title || 'Save the Date'}
      </p>
      <p
        className="font-display relative mt-5 text-4xl"
        style={{ color: d.nameColor || undefined, fontWeight: d.headingBold ? 700 : undefined }}
      >
        {name}
      </p>
      <p className="relative mt-2 text-sm opacity-70" style={{ color: d.introColor || undefined }}>
        {d.intro || typeLabel(config.basics.type, locale)}
      </p>
      <p
        className="relative mt-6 leading-relaxed"
        style={{
          color: d.bodyColor || undefined,
          fontSize: d.bodySizePx || 16,
          fontWeight: d.bodyBold ? 700 : 400,
        }}
      >
        {d.message || config.saveTheDate.message}
      </p>
      <p className="relative mt-4 text-sm font-semibold">
        {[dateLabel, d.timeLabel || config.basics.startTime, d.placeLabel || place]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {d.hosts ? <p className="relative mt-3 text-sm opacity-80">{d.hosts}</p> : null}
      {d.tip ? <p className="relative mt-3 text-xs opacity-60">{d.tip}</p> : null}
      <p className="relative mt-8 text-xs uppercase tracking-widest opacity-60">
        {config.saveTheDate.envelopeLabel}
      </p>
      {ctaHref ? (
        <a
          href={ctaHref}
          className="relative mt-6 inline-block rounded-full px-6 py-2 text-sm font-semibold text-black"
          style={{ background: accent }}
        >
          {cta}
        </a>
      ) : null}
    </div>
  )
}

export function InvitationCard({
  config,
  ctaHref,
  design,
  locale: localeProp,
  guestName,
}: {
  config: EventConfig
  ctaHref?: string
  design?: CardDesign
  locale?: EventLocale
  guestName?: string
}) {
  const theme = THEME_PRESETS[config.branding.theme]
  const accent = config.branding.accentColor || '#22d3ee'
  const locale = localeProp || config.locales.default
  const ui = templateUi(locale)
  const d = design || config.invitation.design
  const name = d.eventName || config.basics.honoreeName || wizardUi(locale).site.honoreeFallback
  const sealUrl = d.sealUrl || config.invitation.sealImageUrl
  const sealLabel = d.sealLabel || config.invitation.sealLabel || 'Mitzvah'
  const greeting = (d.greeting || config.invitation.greeting || '').replace(
    /\{name\}/gi,
    guestName || '',
  )
  const cta = d.ctaRsvp || d.ctaView || ui.confirmRsvp

  return (
    <div
      className="relative mx-auto max-w-lg rounded-[2rem] px-10 py-12 text-center shadow-2xl"
      style={cardShellStyle(d, theme.inviteBg, theme.inviteText)}
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <div
        className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold uppercase tracking-wider text-black shadow-lg"
        style={{ background: sealUrl ? d.sealBg || theme.inviteBg : accent }}
      >
        {sealUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sealUrl} alt={sealLabel} className="h-full w-full object-contain p-1" />
        ) : (
          sealLabel
        )}
      </div>
      {d.panelPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={d.panelPhotoUrl}
          alt=""
          className={`mx-auto mt-6 object-cover ${
            d.panelPhotoShape === 'rectangle' ? 'h-28 w-40 rounded-xl' : 'h-24 w-24 rounded-full'
          }`}
        />
      ) : null}
      <p
        className="mt-6 text-sm italic opacity-80"
        style={{
          color: d.greetingColor || undefined,
          fontSize: d.introSizePx || undefined,
          fontWeight: d.introBold ? 700 : 400,
        }}
      >
        {greeting}
      </p>
      <h2
        className="font-display mt-4 text-4xl"
        style={{
          color: d.nameColor || undefined,
          fontSize: d.headingSizePx || undefined,
          fontWeight: d.headingBold ? 700 : undefined,
        }}
      >
        {name}
      </h2>
      <p
        className="mt-4 leading-relaxed"
        style={{
          color: d.bodyColor || undefined,
          fontSize: d.bodySizePx || 16,
          fontWeight: d.bodyBold ? 700 : 400,
        }}
      >
        {d.message || d.intro || config.invitation.body}
      </p>
      {(d.address1 || d.address2 || d.placeLabel || d.timeLabel || d.dateLabel) && (
        <p className="mt-4 text-sm opacity-80">
          {[d.dateLabel, d.timeLabel, d.placeLabel, d.address1, d.address2].filter(Boolean).join(' · ')}
        </p>
      )}
      <p className="mt-8 text-sm font-semibold">{d.hosts || config.invitation.hostLine}</p>
      {d.tip ? <p className="mt-2 text-xs opacity-60">{d.tip}</p> : null}
      {d.rsvpHint ? <p className="mt-2 text-xs opacity-60">{d.rsvpHint}</p> : null}
      {ctaHref ? (
        <a
          href={ctaHref}
          className="mt-8 inline-block rounded-full px-6 py-2 text-sm font-semibold text-black"
          style={{ background: accent }}
        >
          {d.rsvpLabel || cta}
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
    kind === 'std'
      ? `Save the Date — ${name}`
      : `${typeLabel(config.basics.type, config.locales.default)} — ${name}`

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
