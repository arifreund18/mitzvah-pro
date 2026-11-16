import { google } from './calendar'
import {
  designAssetPublicUrl,
  isEmailSafeImageUrl,
  pageBackgroundCss,
} from './card-background'
import { typeLabel } from './copy'
import { apexHost, eventApexPathUrl, protocolFor } from './site-url'
import type { CardDesign, EventConfig, EventLocale, Guest } from './types'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const CTA: Record<
  EventLocale,
  { std: string; invite: string; rsvp: string; calendar: string; map: string; ics: string }
> = {
  en: {
    std: 'Open save the date',
    invite: 'Open invitation',
    rsvp: 'RSVP',
    calendar: 'Add to Google Calendar',
    map: 'Open map',
    ics: 'Download .ics',
  },
  pt: {
    std: 'Abrir save the date',
    invite: 'Abrir convite',
    rsvp: 'Confirmar presença',
    calendar: 'Google Calendar',
    map: 'Abrir mapa',
    ics: 'Baixar .ics',
  },
  es: {
    std: 'Abrir save the date',
    invite: 'Abrir invitación',
    rsvp: 'Confirmar asistencia',
    calendar: 'Google Calendar',
    map: 'Abrir mapa',
    ics: 'Descargar .ics',
  },
  he: {
    std: 'פתחו את Save the Date',
    invite: 'פתחו את ההזמנה',
    rsvp: 'אשרו הגעה',
    calendar: 'הוסיפו ליומן Google',
    map: 'מפה',
    ics: 'הורדת ICS',
  },
}

const FONT_STACK: Record<string, string> = {
  georgia: 'Georgia, "Times New Roman", serif',
  playfair: '"Playfair Display", Georgia, serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
  lato: 'Lato, Helvetica, Arial, sans-serif',
  montserrat: 'Montserrat, Helvetica, Arial, sans-serif',
  hebrew: '"Noto Sans Hebrew", Arial, sans-serif',
}

function localeOf(guest: Guest, config: EventConfig): EventLocale {
  return guest.inviteLocale || config.locales.default || 'pt'
}

function designOf(kind: 'std' | 'invite', config: EventConfig): CardDesign {
  return kind === 'std' ? config.saveTheDate.design : config.invitation.design
}

function fontFamily(fontKey: string, locale: EventLocale): string {
  if (locale === 'he') return FONT_STACK.hebrew
  return FONT_STACK[fontKey] || FONT_STACK.georgia
}

function sealUrl(kind: 'std' | 'invite', config: EventConfig): string {
  const design = designOf(kind, config)
  return design.sealUrl || config.invitation.sealImageUrl || ''
}

function mapUrlOf(kind: 'std' | 'invite', config: EventConfig): string {
  const design = designOf(kind, config)
  return design.mapUrl || ''
}

function mailImageSrc(
  kind: 'std' | 'invite',
  config: EventConfig,
  host: string,
  raw: string,
  assetKind: 'pageTexture' | 'sealUrl',
): string {
  const value = raw.trim()
  if (!value) return ''
  if (isEmailSafeImageUrl(value)) return value
  // Studio data: uploads → public HTTPS endpoint so Gmail can fetch without inlining base64.
  return designAssetPublicUrl(config.domain.slug, assetKind, {
    host,
    surface: kind === 'std' ? 'std' : 'invite',
  })
}

export function mailSubject(kind: 'std' | 'invite', config: EventConfig, guest?: Guest): string {
  const name = config.basics.honoreeName || 'Mitzvah.pro'
  const locale = guest ? localeOf(guest, config) : config.locales.default
  if (kind === 'std') {
    const custom = designOf('std', config).subject?.trim()
    if (custom) return custom.includes('{name}') ? custom.replaceAll('{name}', name) : custom
    return `Save the Date — ${name}`
  }
  const custom = designOf('invite', config).subject?.trim()
  if (custom) return custom.includes('{name}') ? custom.replaceAll('{name}', name) : custom
  return `${typeLabel(config.basics.type, locale)} — ${name}`
}

export function mailHtml(
  kind: 'std' | 'invite',
  config: EventConfig,
  host: string,
  guest: Guest,
): string {
  const name = config.basics.honoreeName || ''
  const accent = config.branding.accentColor || '#22d3ee'
  const locale = localeOf(guest, config)
  const labels = CTA[locale] || CTA.pt
  const design = designOf(kind, config)
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const font = fontFamily(design.fontKey || 'georgia', locale)
  const token = guest.token
  // Apex paths always resolve without depending on per-event subdomain DNS.
  const cardPath = kind === 'std' ? `/std/${token}` : `/card/${token}`
  const href = eventApexPathUrl(config.domain.slug, cardPath, { host })
  const rsvpHref = eventApexPathUrl(config.domain.slug, `/rsvp/${token}`, { host })
  const apex = apexHost(host)
  const pixelPath =
    kind === 'std'
      ? `/api/platform/std/open/${encodeURIComponent(token)}`
      : `/api/platform/invite/open/${encodeURIComponent(token)}`
  const pixelUrl = `${protocolFor(apex)}://${apex}${pixelPath}`
  const icsHref = `${protocolFor(apex)}://${apex}/api/platform/calendar/${encodeURIComponent(token)}`
  const googleHref = google(config) || `${icsHref}?to=google`
  const mapHref = mapUrlOf(kind, config)
  const sealRaw = sealUrl(kind, config)
  const seal = sealRaw
    ? mailImageSrc(kind, config, host, sealRaw, 'sealUrl')
    : ''
  const sealLabel = config.invitation.sealLabel || 'Mitzvah'
  const pageTextureRaw = design.pageTexture?.trim() || ''
  const pageTextureForMail = pageTextureRaw
    ? mailImageSrc(kind, config, host, pageTextureRaw, 'pageTexture')
    : ''

  const body = kind === 'std' ? config.saveTheDate.message : config.invitation.body
  const greeting = kind === 'invite' ? config.invitation.greeting : 'Save the Date'
  const cta = design.ctaView || (kind === 'std' ? labels.std : labels.invite)
  const calendarLabel = design.ctaCalendar || labels.calendar
  const mapLabel = design.ctaMap || labels.map
  const cardBg = design.cardColor || '#f7f1e4'
  const textColor = design.cardTextColor || '#1c1630'
  const greetingColor = design.greetingColor || accent
  const nameColor = design.nameColor || textColor
  const bodyColor = design.bodyColor || textColor
  const bodySize = design.bodySizePx || 16
  const bodyWeight = design.bodyBold ? '700' : '400'

  const sealBlock = seal
    ? `<tr><td style="padding-bottom:12px;">
        <img src="${escapeHtml(seal)}" alt="${escapeHtml(sealLabel)}" width="72" height="72" style="width:72px;height:72px;border-radius:999px;object-fit:contain;background:${escapeHtml(design.sealBg || '#fff')};" />
      </td></tr>`
    : ''

  const calendarBlock = googleHref
    ? `<tr><td style="padding-top:18px;">
        <a href="${escapeHtml(googleHref)}" style="color:${escapeHtml(accent)};font-size:13px;text-decoration:underline;margin:0 8px;">${escapeHtml(calendarLabel)}</a>
        <a href="${escapeHtml(icsHref)}" style="color:${escapeHtml(accent)};font-size:13px;text-decoration:underline;margin:0 8px;">${escapeHtml(labels.ics)}</a>
      </td></tr>`
    : ''

  const mapBlock = mapHref
    ? `<tr><td style="padding-top:10px;">
        <a href="${escapeHtml(mapHref)}" style="color:${escapeHtml(accent)};font-size:13px;text-decoration:underline;">${escapeHtml(mapLabel)}</a>
      </td></tr>`
    : ''

  const pageBgCss = pageBackgroundCss(design, escapeHtml, pageTextureForMail)

  return `<!doctype html>
<html lang="${escapeHtml(locale)}" dir="${dir}">
<body style="margin:0;${pageBgCss}font-family:${escapeHtml(font)};color:${escapeHtml(textColor)};" dir="${dir}">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;${pageBgCss}" dir="${dir}">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:${escapeHtml(cardBg)};border-radius:24px;padding:40px 32px;text-align:center;font-family:${escapeHtml(font)};">
        ${sealBlock}
        <tr><td style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:${escapeHtml(greetingColor)};">${escapeHtml(greeting)}</td></tr>
        <tr><td style="padding-top:16px;font-size:32px;color:${escapeHtml(nameColor)};font-family:${escapeHtml(font)};">${escapeHtml(name)}</td></tr>
        <tr><td style="padding-top:16px;font-size:${bodySize}px;line-height:1.5;font-weight:${bodyWeight};color:${escapeHtml(bodyColor)};">${escapeHtml(body)}</td></tr>
        <tr><td style="padding-top:12px;font-size:14px;">${escapeHtml(guest.familyName)}</td></tr>
        <tr><td style="padding-top:28px;">
          <a href="${escapeHtml(href)}" style="background:${escapeHtml(accent)};color:#0b1020;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;display:inline-block;">${escapeHtml(cta)}</a>
        </td></tr>
        <tr><td style="padding-top:16px;">
          <a href="${escapeHtml(rsvpHref)}" style="color:${escapeHtml(accent)};font-size:14px;">${escapeHtml(labels.rsvp)}</a>
        </td></tr>
        ${calendarBlock}
        ${mapBlock}
      </table>
    </td></tr>
  </table>
  <img src="${escapeHtml(pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
</body>
</html>`
}
