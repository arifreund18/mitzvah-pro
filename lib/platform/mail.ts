import { google } from './calendar.ts'
import {
  designAssetPublicUrl,
  isEmailSafeImageUrl,
  pageBackgroundCss,
} from './card-background.ts'
import { formatEventDate, typeLabel } from './copy.ts'
import { apexHost, eventApexPathUrl, protocolFor } from './site-url.ts'
import type { CardDesign, EventConfig, EventLocale, Guest } from './types.ts'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const CTA: Record<
  EventLocale,
  {
    std: string
    invite: string
    viewCard: string
    rsvp: string
    calendar: string
    map: string
    ics: string
  }
> = {
  en: {
    std: 'Open save the date',
    invite: 'Open invitation',
    viewCard: 'VIEW THE CARD',
    rsvp: 'RSVP',
    calendar: 'Add to calendar',
    map: 'View map',
    ics: 'Download .ics',
  },
  pt: {
    std: 'Abrir save the date',
    invite: 'Abrir convite',
    viewCard: 'VER O CONVITE',
    rsvp: 'RSVP',
    calendar: 'Adicionar ao calendário',
    map: 'Ver mapa',
    ics: 'Baixar .ics',
  },
  es: {
    std: 'Abrir save the date',
    invite: 'Abrir invitación',
    viewCard: 'VER LA INVITACIÓN',
    rsvp: 'RSVP',
    calendar: 'Añadir al calendario',
    map: 'Ver mapa',
    ics: 'Descargar .ics',
  },
  he: {
    std: 'פתחו את Save the Date',
    invite: 'פתחו את ההזמנה',
    viewCard: 'לצפייה בכרטיס',
    rsvp: 'RSVP',
    calendar: 'הוסיפו ליומן',
    map: 'מפה',
    ics: 'הורדת ICS',
  },
}

const FONT_STACK: Record<string, string> = {
  georgia: 'Georgia, \'Times New Roman\', serif',
  playfair: '\'Playfair Display\', Georgia, serif',
  cormorant: '\'Cormorant Garamond\', Georgia, serif',
  lato: 'Lato, Helvetica, Arial, sans-serif',
  montserrat: 'Montserrat, Helvetica, Arial, sans-serif',
  hebrew: '\'Noto Sans Hebrew\', Arial, sans-serif',
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
  return designAssetPublicUrl(config.domain.slug, assetKind, {
    host,
    surface: kind === 'std' ? 'std' : 'invite',
  })
}

function eventTitle(kind: 'std' | 'invite', config: EventConfig, locale: EventLocale): string {
  const design = designOf(kind, config)
  if (design.eventName?.trim()) return design.eventName.trim()
  if (design.title?.trim()) return design.title.trim()
  const honoree = config.basics.honoreeName || 'Mitzvah.pro'
  return `${honoree}'s ${typeLabel(config.basics.type, locale)}`
}

function eventDateLine(kind: 'std' | 'invite', config: EventConfig, locale: EventLocale): string {
  const design = designOf(kind, config)
  if (design.dateLabel?.trim()) return design.dateLabel.trim()
  return formatEventDate(config.basics.date, locale, '')
}

function eventTimeLine(kind: 'std' | 'invite', config: EventConfig): string {
  const design = designOf(kind, config)
  if (design.timeLabel?.trim()) return design.timeLabel.trim()
  return config.basics.startTime || ''
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

/** Bar-Beni–style invitation email: view-card link, colored card+seal, details, RSVP. */
export function mailHtml(
  kind: 'std' | 'invite',
  config: EventConfig,
  host: string,
  guest: Guest,
): string {
  const locale = localeOf(guest, config)
  const labels = CTA[locale] || CTA.pt
  const design = designOf(kind, config)
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const font = fontFamily(design.fontKey || 'georgia', locale)
  const token = guest.token
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
  const googleHref = google(config, kind) || `${icsHref}?to=google`
  const mapHref = mapUrlOf(kind, config)
  const sealRaw = sealUrl(kind, config)
  const seal = sealRaw ? mailImageSrc(kind, config, host, sealRaw, 'sealUrl') : ''
  const pageTextureRaw = design.pageTexture?.trim() || ''
  const pageTextureForMail = pageTextureRaw
    ? mailImageSrc(kind, config, host, pageTextureRaw, 'pageTexture')
    : ''

  const cardColor = design.cardColor || config.branding.primaryColor || '#1a2033'
  const cardTextColor = design.cardTextColor || '#ffffff'
  const rsvpTextColor = design.ctaRsvpColor || '#ffffff'
  const textColor = design.bodyColor || design.headingColor || '#111111'
  const mutedColor = textColor === '#FFFFFF' || textColor === '#ffffff' ? '#EEEEEE' : '#333333'
  const titleColor = design.headingColor || design.nameColor || textColor
  const pageBgCss = pageBackgroundCss(design, escapeHtml, pageTextureForMail)

  const viewCard = design.ctaView || labels.viewCard
  const calendarLabel = design.ctaCalendar || labels.calendar
  const mapLabel = design.ctaMap || labels.map
  const rsvpLabel = design.ctaRsvp || design.rsvpLabel || labels.rsvp
  const title = eventTitle(kind, config, locale)
  const dateLine = eventDateLine(kind, config, locale)
  const timeLine = eventTimeLine(kind, config)
  const venue = design.placeLabel?.trim() || ''
  const address1 = design.address1?.trim() || ''
  const address2 = design.address2?.trim() || ''
  const familyName = guest.familyName || 'Guest'

  const sealCell = seal
    ? `<td align="right" valign="top" style="padding:16px 16px 0 0;line-height:0;font-size:0;">
        <img src="${escapeHtml(seal)}" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;object-fit:contain;" />
      </td>`
    : `<td width="72" style="padding:16px 16px 0 0;"></td>`

  const mapsBlock =
    venue || address1 || address2 || mapHref
      ? `${
          venue
            ? `<p style="margin:16px 0 0;font-family:${font};font-size:16px;font-weight:bold;color:${escapeHtml(titleColor)};">${escapeHtml(venue)}</p>`
            : ''
        }
        ${
          address1
            ? mapHref
              ? `<p style="margin:4px 0 0;font-family:${font};font-size:14px;line-height:1.5;"><a href="${escapeHtml(mapHref)}" style="color:${escapeHtml(titleColor)};text-decoration:underline;">${escapeHtml(address1)}</a></p>`
              : `<p style="margin:4px 0 0;font-family:${font};font-size:14px;color:${escapeHtml(mutedColor)};line-height:1.5;">${escapeHtml(address1)}</p>`
            : ''
        }
        ${
          address2
            ? mapHref
              ? `<p style="margin:0;font-family:${font};font-size:14px;"><a href="${escapeHtml(mapHref)}" style="color:${escapeHtml(titleColor)};text-decoration:underline;">${escapeHtml(address2)}</a></p>`
              : `<p style="margin:0;font-family:${font};font-size:14px;color:${escapeHtml(mutedColor)};">${escapeHtml(address2)}</p>`
            : ''
        }
        ${
          mapHref
            ? `<p style="margin:12px 0 0;"><a href="${escapeHtml(mapHref)}" style="font-family:${font};font-size:13px;color:${escapeHtml(textColor)};text-decoration:underline;">${escapeHtml(mapLabel)}</a></p>`
            : ''
        }`
      : ''

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;${pageBgCss}font-family:${font};" dir="${dir}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${pageBgCss}">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="${escapeHtml(href)}" style="font-family:${font};font-size:11px;letter-spacing:0.12em;color:${escapeHtml(mutedColor)};text-decoration:none;text-transform:uppercase;">${escapeHtml(viewCard)}</a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${escapeHtml(href)}" style="text-decoration:none;color:inherit;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:400px;background-color:${escapeHtml(cardColor)};border-radius:2px;">
                  <tr>
                    <td width="*" style="font-size:0;line-height:0;">&nbsp;</td>
                    ${sealCell}
                  </tr>
                  <tr>
                    <td colspan="2" align="center" style="padding:48px 24px 56px;font-family:${font};font-size:32px;font-weight:bold;color:${escapeHtml(cardTextColor)};line-height:1.2;">
                      ${escapeHtml(familyName)}
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:32px 8px 0;">
              <p style="margin:0;font-family:${font};font-size:22px;color:${escapeHtml(titleColor)};line-height:1.35;">${escapeHtml(title)}</p>
              ${dateLine ? `<p style="margin:16px 0 0;font-family:${font};font-size:15px;color:${escapeHtml(mutedColor)};">${escapeHtml(dateLine)}</p>` : ''}
              ${timeLine ? `<p style="margin:4px 0 0;font-family:${font};font-size:15px;color:${escapeHtml(mutedColor)};">${escapeHtml(timeLine)}</p>` : ''}
              ${
                googleHref
                  ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(googleHref)}" style="font-family:${font};font-size:13px;color:${escapeHtml(textColor)};text-decoration:underline;">${escapeHtml(calendarLabel)}</a></p>`
                  : ''
              }
              ${mapsBlock}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:32px 8px 0;">
              <a href="${escapeHtml(rsvpHref)}" style="display:inline-block;font-family:${font};font-size:14px;font-weight:bold;color:${escapeHtml(rsvpTextColor)};background-color:${escapeHtml(cardColor)};text-decoration:none;padding:14px 28px;border-radius:999px;">${escapeHtml(rsvpLabel)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <img src="${escapeHtml(pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
</body>
</html>`
}
