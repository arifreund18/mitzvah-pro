import { google } from './calendar.ts'
import {
  designAssetPublicUrl,
  isEmailSafeImageUrl,
  pageBackgroundCss,
} from './card-background.ts'
import { formatEventDate, typeLabel } from './copy.ts'
import { chromeCtaText, inviteRsvpLabel, resolveGuestLocale } from './guest-locale.ts'
import { getLocalizedCardDesign } from './i18n-content.ts'
import { apexHost, eventApexPathUrl, protocolFor } from './site-url.ts'
import {
  followUpCopy,
  followUpHeadline,
  followUpSubject,
  hostDisplayName,
  previewMessage,
} from './follow-up.ts'
import type {
  CardDesign,
  EventConfig,
  EventLocale,
  Guest,
  HostFollowUp,
} from './types.ts'

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
    viewCard: 'VIEW THE INVITATION',
    rsvp: 'Confirm attendance',
    calendar: 'Add to calendar',
    map: 'View map',
    ics: 'Download .ics',
  },
  pt: {
    std: 'Abrir save the date',
    invite: 'Abrir convite',
    viewCard: 'VER O CONVITE',
    rsvp: 'Confirmar presença',
    calendar: 'Adicionar ao calendário',
    map: 'Ver mapa',
    ics: 'Baixar .ics',
  },
  es: {
    std: 'Abrir save the date',
    invite: 'Abrir invitación',
    viewCard: 'VER LA INVITACIÓN',
    rsvp: 'Confirmar asistencia',
    calendar: 'Añadir al calendario',
    map: 'Ver mapa',
    ics: 'Descargar .ics',
  },
  he: {
    std: 'פתחו את Save the Date',
    invite: 'פתחו את ההזמנה',
    viewCard: 'לצפייה בהזמנה',
    rsvp: 'אישור הגעה',
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
  return resolveGuestLocale(guest, config)
}

function designOf(kind: 'std' | 'invite', config: EventConfig, locale: EventLocale): CardDesign {
  return getLocalizedCardDesign(config, locale, kind)
}

function fontFamily(fontKey: string, locale: EventLocale): string {
  if (locale === 'he') return FONT_STACK.hebrew
  return FONT_STACK[fontKey] || FONT_STACK.georgia
}

function sealUrl(kind: 'std' | 'invite', config: EventConfig, locale: EventLocale): string {
  const design = designOf(kind, config, locale)
  return design.sealUrl || config.invitation.sealImageUrl || ''
}

function mapUrlOf(kind: 'std' | 'invite', config: EventConfig, locale: EventLocale): string {
  const design = designOf(kind, config, locale)
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
  const design = designOf(kind, config, locale)
  if (design.eventName?.trim()) return design.eventName.trim()
  if (design.title?.trim()) return design.title.trim()
  const honoree = config.basics.honoreeName || 'Mitzvah.pro'
  return `${honoree}'s ${typeLabel(config.basics.type, locale)}`
}

function eventDateLine(kind: 'std' | 'invite', config: EventConfig, locale: EventLocale): string {
  const design = designOf(kind, config, locale)
  if (design.dateLabel?.trim()) return design.dateLabel.trim()
  return formatEventDate(config.basics.date, locale, '')
}

function eventTimeLine(kind: 'std' | 'invite', config: EventConfig, locale: EventLocale): string {
  const design = designOf(kind, config, locale)
  if (design.timeLabel?.trim()) return design.timeLabel.trim()
  return config.basics.startTime || ''
}

export function mailSubject(kind: 'std' | 'invite', config: EventConfig, guest?: Guest): string {
  const name = config.basics.honoreeName || 'Mitzvah.pro'
  const locale = guest ? localeOf(guest, config) : config.locales.default
  if (kind === 'std') {
    const custom = designOf('std', config, locale).subject?.trim()
    if (custom) return custom.includes('{name}') ? custom.replaceAll('{name}', name) : custom
    return `Save the Date — ${name}`
  }
  const custom = designOf('invite', config, locale).subject?.trim()
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
  const design = designOf(kind, config, locale)
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const font = fontFamily(design.fontKey || 'georgia', locale)
  const token = guest.token
  const cardPath = kind === 'std' ? `/std/${token}` : `/card/${token}`
  // View-card + RSVP open the invitation; calendar/map keep their real destinations.
  const href = eventApexPathUrl(config.domain.slug, cardPath, { host })
  const apex = apexHost(host)
  const pixelPath =
    kind === 'std'
      ? `/api/platform/std/open/${encodeURIComponent(token)}`
      : `/api/platform/invite/open/${encodeURIComponent(token)}`
  const pixelUrl = `${protocolFor(apex)}://${apex}${pixelPath}`
  const icsHref = `${protocolFor(apex)}://${apex}/api/platform/calendar/${encodeURIComponent(token)}`
  const googleHref = google(config, kind) || `${icsHref}?to=google`
  const mapHref = mapUrlOf(kind, config, locale)
  const sealRaw = sealUrl(kind, config, locale)
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

  const viewCard = chromeCtaText(config, locale, kind, 'ctaView', labels.viewCard)
  const calendarLabel = chromeCtaText(config, locale, kind, 'ctaCalendar', labels.calendar)
  const mapLabel = chromeCtaText(config, locale, kind, 'ctaMap', labels.map)
  const rsvpLabel =
    kind === 'invite'
      ? inviteRsvpLabel(config, locale, design, labels.rsvp)
      : chromeCtaText(config, locale, kind, 'ctaRsvp', labels.rsvp)
  const title = eventTitle(kind, config, locale)
  const dateLine = eventDateLine(kind, config, locale)
  const timeLine = eventTimeLine(kind, config, locale)
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
              <a href="${escapeHtml(href)}" style="display:inline-block;font-family:${font};font-size:14px;font-weight:bold;color:${escapeHtml(rsvpTextColor)};background-color:${escapeHtml(cardColor)};text-decoration:none;padding:14px 28px;border-radius:999px;">${escapeHtml(rsvpLabel)}</a>
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

const RSVP_CONFIRM: Record<
  EventLocale,
  {
    attending: string
    notAttending: string
    going: string
    notGoing: string
    editResponse: string
    calendar: string
    map: string
    viewCard: string
    subject: string
  }
> = {
  en: {
    attending: "You're attending.",
    notAttending: "You're not attending.",
    going: 'Going',
    notGoing: 'Not going',
    editResponse: 'EDIT RESPONSE',
    calendar: 'ADD TO CALENDAR',
    map: 'VIEW LOCATION',
    viewCard: 'VIEW CARD',
    subject: 'RSVP confirmed',
  },
  pt: {
    attending: 'Você confirmou presença.',
    notAttending: 'Você não vai comparecer.',
    going: 'Vai',
    notGoing: 'Não vai',
    editResponse: 'EDITAR RESPOSTA',
    calendar: 'ADICIONAR AO CALENDÁRIO',
    map: 'VER LOCAL',
    viewCard: 'VER O CONVITE',
    subject: 'RSVP confirmado',
  },
  es: {
    attending: 'Confirmaste tu asistencia.',
    notAttending: 'No vas a asistir.',
    going: 'Asiste',
    notGoing: 'No asiste',
    editResponse: 'EDITAR RESPUESTA',
    calendar: 'AÑADIR AL CALENDARIO',
    map: 'VER UBICACIÓN',
    viewCard: 'VER LA INVITACIÓN',
    subject: 'RSVP confirmado',
  },
  he: {
    attending: 'אישרתם הגעה.',
    notAttending: 'לא תגיעו.',
    going: 'מגיעים',
    notGoing: 'לא מגיעים',
    editResponse: 'עריכת תשובה',
    calendar: 'הוספה ליומן',
    map: 'צפייה במקום',
    viewCard: 'לצפייה בכרטיס',
    subject: 'RSVP אושר',
  },
}

/** True when at least one person in the family RSVP'd yes. */
export function guestHasYesRsvp(guest: Guest): boolean {
  if (guest.people?.length) return guest.people.some((person) => person.status === 'yes')
  return guest.status === 'yes'
}

/** Names of people with a given RSVP status (falls back to family name when no people[]). */
export function guestRsvpNames(guest: Guest, status: 'yes' | 'no'): string[] {
  const people = guest.people || []
  if (people.length) {
    return people
      .filter((person) => person.status === status)
      .map((person) => person.name.trim())
      .filter(Boolean)
  }
  if (guest.status === status) {
    const fallback = guest.familyName.trim()
    return fallback ? [fallback] : []
  }
  return []
}

function formatRsvpStatusLine(label: string, names: string[]): string {
  if (!names.length) return label
  return `${label} ${names.join(', ')}`
}

export function mailRsvpConfirmationSubject(config: EventConfig, guest: Guest): string {
  const locale = localeOf(guest, config)
  const labels = RSVP_CONFIRM[locale] || RSVP_CONFIRM.pt
  const name = config.basics.honoreeName || config.domain.slug || 'Mitzvah.pro'
  return `${labels.subject} — ${name}`
}

/**
 * RSVP confirmation email: status header, same invite card visual, hosts/body,
 * detail rows (edit / calendar / map), view-card CTA. Token links only.
 */
export function mailRsvpConfirmationHtml(
  config: EventConfig,
  host: string,
  guest: Guest,
): string {
  const locale = localeOf(guest, config)
  const labels = RSVP_CONFIRM[locale] || RSVP_CONFIRM.pt
  const design = designOf('invite', config, locale)
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const font = fontFamily(design.fontKey || 'georgia', locale)
  const token = guest.token
  const attending = guestHasYesRsvp(guest)

  const cardHref = eventApexPathUrl(config.domain.slug, `/card/${token}`, { host })
  const rsvpHref = eventApexPathUrl(config.domain.slug, `/rsvp/${token}`, { host })
  const apex = apexHost(host)
  const icsHref = `${protocolFor(apex)}://${apex}/api/platform/calendar/${encodeURIComponent(token)}`
  const googleHref = google(config, 'invite') || `${icsHref}?to=google`
  const mapHref = mapUrlOf('invite', config, locale)

  const sealRaw = sealUrl('invite', config, locale)
  const seal = sealRaw ? mailImageSrc('invite', config, host, sealRaw, 'sealUrl') : ''
  const pageTextureRaw = design.pageTexture?.trim() || ''
  const pageTextureForMail = pageTextureRaw
    ? mailImageSrc('invite', config, host, pageTextureRaw, 'pageTexture')
    : ''

  const cardColor = design.cardColor || config.branding.primaryColor || '#1a2033'
  const cardTextColor = design.cardTextColor || '#ffffff'
  const viewCardTextColor = design.ctaRsvpColor || '#ffffff'
  const textColor = design.bodyColor || design.headingColor || '#111111'
  const mutedColor = textColor === '#FFFFFF' || textColor === '#ffffff' ? '#EEEEEE' : '#666666'
  const titleColor = design.headingColor || design.nameColor || textColor
  const pageBgCss = pageBackgroundCss(design, escapeHtml, pageTextureForMail)
  const linkMuted = mutedColor
  const actionColor = '#888888'

  const viewCard = chromeCtaText(config, locale, 'invite', 'ctaView', labels.viewCard)
  const calendarLabel = chromeCtaText(
    config,
    locale,
    'invite',
    'ctaCalendar',
    labels.calendar,
  ).toUpperCase()
  const mapLabel = chromeCtaText(config, locale, 'invite', 'ctaMap', labels.map).toUpperCase()

  const inviteTitle = eventTitle('invite', config, locale)
  const title = (config.rsvp?.confirmationEmailTitle || '').trim() || inviteTitle
  const dateLine = eventDateLine('invite', config, locale)
  const timeLine = eventTimeLine('invite', config, locale)
  const venue = design.placeLabel?.trim() || ''
  const address1 = design.address1?.trim() || ''
  const address2 = design.address2?.trim() || ''
  const familyName = guest.familyName || 'Guest'
  const inviteHosts = (design.hosts?.trim() || config.invitation.hostLine || '').trim()
  // Card message only — never fall back to invitation.body (site copy).
  const inviteBody = (design.message || '').trim()
  const hostLine = (config.rsvp?.confirmationEmailHosts || '').trim() || inviteHosts
  const bodyText = (config.rsvp?.confirmationEmailBody || '').trim() || inviteBody
  const statusHeadline = attending ? labels.attending : labels.notAttending
  const goingNames = guestRsvpNames(guest, 'yes')
  const notGoingNames = guestRsvpNames(guest, 'no')

  const sealCell = seal
    ? `<td align="right" valign="top" style="padding:16px 16px 0 0;line-height:0;font-size:0;">
        <img src="${escapeHtml(seal)}" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;object-fit:contain;" />
      </td>`
    : `<td width="72" style="padding:16px 16px 0 0;"></td>`

  const iconYes = `<span style="display:inline-block;width:22px;height:22px;border:1.5px solid ${escapeHtml(textColor)};border-radius:50%;text-align:center;line-height:20px;font-size:12px;color:${escapeHtml(textColor)};">&#10003;</span>`
  const iconNo = `<span style="display:inline-block;width:22px;height:22px;border:1.5px solid ${escapeHtml(mutedColor)};border-radius:50%;text-align:center;line-height:20px;font-size:12px;color:${escapeHtml(mutedColor)};">&#10005;</span>`
  const iconClock = `<span style="display:inline-block;width:22px;height:22px;border:1.5px solid ${escapeHtml(mutedColor)};border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:${escapeHtml(mutedColor)};">&#9200;</span>`
  const iconPin = `<span style="display:inline-block;width:22px;height:22px;border:1.5px solid ${escapeHtml(mutedColor)};border-radius:50%;text-align:center;line-height:20px;font-size:12px;color:${escapeHtml(mutedColor)};">&#9679;</span>`

  const actionLink = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" style="font-family:${font};font-size:11px;letter-spacing:0.08em;color:${escapeHtml(actionColor)};text-decoration:none;white-space:nowrap;">${escapeHtml(label)}</a>`

  const detailRow = (opts: {
    icon: string
    primary: string
    secondary?: string
    secondaryHref?: string
    actionHref?: string
    actionLabel?: string
  }) => {
    const secondaryHtml = opts.secondary
      ? opts.secondaryHref
        ? `<div style="margin:2px 0 0;font-family:${font};font-size:13px;line-height:1.4;"><a href="${escapeHtml(opts.secondaryHref)}" style="color:#2563eb;text-decoration:underline;">${escapeHtml(opts.secondary)}</a></div>`
        : `<div style="margin:2px 0 0;font-family:${font};font-size:13px;color:${escapeHtml(mutedColor)};line-height:1.4;">${escapeHtml(opts.secondary)}</div>`
      : ''
    const actionCell =
      opts.actionHref && opts.actionLabel
        ? `<td align="right" valign="middle" style="padding:16px 0 16px 12px;white-space:nowrap;">${actionLink(opts.actionHref, opts.actionLabel)}</td>`
        : ''
    return `<tr>
      <td valign="top" style="padding:16px 10px 16px 0;width:28px;">${opts.icon}</td>
      <td valign="middle" style="padding:16px 0;">
        <div style="font-family:${font};font-size:15px;font-weight:bold;color:${escapeHtml(textColor)};line-height:1.35;">${escapeHtml(opts.primary)}</div>
        ${secondaryHtml}
      </td>
      ${actionCell}
    </tr>`
  }

  const addressLine = [address1, address2].filter(Boolean).join(', ')
  const locationPrimary = venue || addressLine
  const locationSecondary = venue && addressLine ? addressLine : ''

  const rows: string[] = []
  const goingLine = formatRsvpStatusLine(labels.going, goingNames)
  const notGoingLine = formatRsvpStatusLine(labels.notGoing, notGoingNames)
  if (goingNames.length) {
    rows.push(
      detailRow({
        icon: iconYes,
        primary: goingLine,
        actionHref: rsvpHref,
        actionLabel: labels.editResponse,
      }),
    )
  }
  if (notGoingNames.length) {
    rows.push(
      detailRow({
        icon: iconNo,
        primary: notGoingLine,
        actionHref: goingNames.length ? undefined : rsvpHref,
        actionLabel: goingNames.length ? undefined : labels.editResponse,
      }),
    )
  }
  if (!goingNames.length && !notGoingNames.length) {
    rows.push(
      detailRow({
        icon: attending ? iconYes : iconNo,
        primary: attending ? labels.going : labels.notGoing,
        actionHref: rsvpHref,
        actionLabel: labels.editResponse,
      }),
    )
  }
  if (dateLine || timeLine) {
    rows.push(
      detailRow({
        icon: iconClock,
        primary: dateLine || timeLine,
        secondary: dateLine ? timeLine : '',
        actionHref: googleHref || undefined,
        actionLabel: googleHref ? calendarLabel : undefined,
      }),
    )
  }
  if (locationPrimary) {
    rows.push(
      detailRow({
        icon: iconPin,
        primary: locationPrimary,
        secondary: locationSecondary,
        secondaryHref: mapHref || undefined,
        actionHref: mapHref || undefined,
        actionLabel: mapHref ? mapLabel : undefined,
      }),
    )
  }

  const divider = `<tr><td colspan="3" style="border-top:1px solid #e5e5e5;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>`
  const detailsTable = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${divider}
        ${rows.join(`\n${divider}\n`)}
        ${divider}
      </table>`
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
            <td align="center" style="padding-bottom:20px;">
              <p style="margin:0;font-family:${font};font-size:15px;color:${escapeHtml(linkMuted)};">${escapeHtml(statusHeadline)}</p>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${escapeHtml(cardHref)}" style="text-decoration:none;color:inherit;">
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
            <td align="center" style="padding:28px 8px 0;">
              <p style="margin:0;font-family:${font};font-size:22px;font-weight:bold;color:${escapeHtml(titleColor)};line-height:1.35;">${escapeHtml(title)}</p>
              ${
                hostLine
                  ? `<p style="margin:10px 0 0;font-family:${font};font-size:14px;color:${escapeHtml(mutedColor)};">${escapeHtml(hostLine)}</p>`
                  : ''
              }
              ${
                bodyText
                  ? `<p style="margin:14px 0 0;font-family:${font};font-size:15px;color:${escapeHtml(textColor)};line-height:1.5;">${escapeHtml(bodyText).replace(/\n/g, '<br>')}</p>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 0;">
              ${detailsTable}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 8px 0;">
              <a href="${escapeHtml(cardHref)}" style="display:inline-block;font-family:${font};font-size:13px;font-weight:bold;letter-spacing:0.06em;color:${escapeHtml(viewCardTextColor)};background-color:${escapeHtml(cardColor)};text-decoration:none;padding:14px 36px;border-radius:999px;">${escapeHtml(viewCard)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function mailFollowUpSubject(
  followUp: Pick<HostFollowUp, 'type' | 'subject'>,
  config: EventConfig,
  guest?: Guest,
): string {
  const locale = guest ? localeOf(guest, config) : config.locales.default
  const title = eventTitle('invite', config, locale)
  const hostName = hostDisplayName(config)
  return followUpSubject(followUp.type, locale, title, hostName, followUp.subject)
}

/**
 * Host follow-up email:
 * - reminder: greeting + body + VIEW CARD + card + event details (calendar/map)
 * - message / update: headline + event + quoted body + CTA buttons
 */
export function mailFollowUpHtml(
  followUp: Pick<HostFollowUp, 'type' | 'body'>,
  config: EventConfig,
  host: string,
  guest: Guest,
): string {
  const locale = localeOf(guest, config)
  const labels = followUpCopy(locale)
  const design = designOf('invite', config, locale)
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const font = fontFamily(design.fontKey || 'georgia', locale)
  const token = guest.token
  const hostName = hostDisplayName(config)
  const title = eventTitle('invite', config, locale)
  const headline = followUpHeadline(followUp.type, locale, hostName)
  const body = followUp.body.trim()
  const bodyHtml = escapeHtml(body).replace(/\n/g, '<br>')

  const cardHref = eventApexPathUrl(config.domain.slug, `/card/${token}`, { host })
  const messagesHref = eventApexPathUrl(config.domain.slug, `/messages/${token}`, { host })
  const apex = apexHost(host)
  const icsHref = `${protocolFor(apex)}://${apex}/api/platform/calendar/${encodeURIComponent(token)}`
  const googleHref = google(config, 'invite') || `${icsHref}?to=google`
  const mapHref = mapUrlOf('invite', config, locale)

  const pageTextureRaw = design.pageTexture?.trim() || ''
  const pageTextureForMail = pageTextureRaw
    ? mailImageSrc('invite', config, host, pageTextureRaw, 'pageTexture')
    : ''
  const pageBgCss = pageBackgroundCss(design, escapeHtml, pageTextureForMail)

  const cardColor = design.cardColor || config.branding.primaryColor || '#1a2033'
  const cardTextColor = design.cardTextColor || '#ffffff'
  const ctaTextColor = design.ctaRsvpColor || '#ffffff'
  const textColor = design.bodyColor || design.headingColor || '#3d3429'
  const mutedColor = '#6b5f52'
  const titleColor = design.headingColor || design.nameColor || textColor
  const buttonBg = design.cardColor || '#4a5a3c'

  const dateLine = eventDateLine('invite', config, locale)
  const timeLine = eventTimeLine('invite', config, locale)
  const venue = design.placeLabel?.trim() || ''
  const address1 = design.address1?.trim() || ''
  const address2 = design.address2?.trim() || ''
  const addressLine = [address1, address2].filter(Boolean).join(', ')
  const hostLine = (design.hosts?.trim() || config.invitation.hostLine || '').trim()
  const familyName = guest.familyName || ''
  const sealRaw = sealUrl('invite', config, locale)
  const seal = sealRaw ? mailImageSrc('invite', config, host, sealRaw, 'sealUrl') : ''

  const viewCard = chromeCtaText(config, locale, 'invite', 'ctaView', labels.viewCard)
  const calendarLabel = chromeCtaText(config, locale, 'invite', 'ctaCalendar', labels.calendar)
  const mapLabel = chromeCtaText(config, locale, 'invite', 'ctaMap', labels.map)

  if (followUp.type === 'reminder') {
    const sealCell = seal
      ? `<td align="right" valign="top" style="padding:16px 16px 0 0;line-height:0;font-size:0;">
          <img src="${escapeHtml(seal)}" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;object-fit:contain;" />
        </td>`
      : `<td width="72" style="padding:16px 16px 0 0;"></td>`

    const locationBits = [venue, addressLine].filter(Boolean).join(' · ')
    const iconClock = `<span style="display:inline-block;width:22px;height:22px;border:1.5px solid ${escapeHtml(mutedColor)};border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:${escapeHtml(mutedColor)};">&#9200;</span>`
    const iconPin = `<span style="display:inline-block;width:22px;height:22px;border:1.5px solid ${escapeHtml(mutedColor)};border-radius:50%;text-align:center;line-height:20px;font-size:12px;color:${escapeHtml(mutedColor)};">&#9679;</span>`

    const detailRows: string[] = []
    if (dateLine || timeLine) {
      detailRows.push(`<tr>
        <td valign="top" style="padding:16px 10px 16px 0;width:28px;">${iconClock}</td>
        <td valign="middle" style="padding:16px 0;">
          <div style="font-family:${font};font-size:15px;font-weight:bold;color:${escapeHtml(textColor)};">${escapeHtml([dateLine, timeLine].filter(Boolean).join(' · '))}</div>
        </td>
        <td align="right" valign="middle" style="padding:16px 0 16px 12px;white-space:nowrap;">
          ${
            googleHref
              ? `<a href="${escapeHtml(googleHref)}" style="font-family:${font};font-size:11px;letter-spacing:0.08em;color:#888;text-decoration:none;">${escapeHtml(calendarLabel)}</a>`
              : ''
          }
        </td>
      </tr>`)
    }
    if (venue || addressLine) {
      detailRows.push(`<tr>
        <td valign="top" style="padding:16px 10px 16px 0;width:28px;">${iconPin}</td>
        <td valign="middle" style="padding:16px 0;">
          <div style="font-family:${font};font-size:15px;font-weight:bold;color:${escapeHtml(textColor)};">${escapeHtml(venue || addressLine)}</div>
          ${
            venue && addressLine
              ? `<div style="margin:2px 0 0;font-family:${font};font-size:13px;color:${escapeHtml(mutedColor)};">${escapeHtml(addressLine)}</div>`
              : ''
          }
        </td>
        <td align="right" valign="middle" style="padding:16px 0 16px 12px;white-space:nowrap;">
          ${
            mapHref
              ? `<a href="${escapeHtml(mapHref)}" style="font-family:${font};font-size:11px;letter-spacing:0.08em;color:#888;text-decoration:none;">${escapeHtml(mapLabel)}</a>`
              : ''
          }
        </td>
      </tr>`)
    }

    return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;${pageBgCss}font-family:${font};" dir="${dir}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${pageBgCss}">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:8px;">
              <p style="margin:0;font-family:${font};font-size:18px;color:${escapeHtml(titleColor)};">${escapeHtml(labels.greeting(familyName))}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 8px 0;">
              <p style="margin:0;font-family:${font};font-size:15px;line-height:1.55;color:${escapeHtml(textColor)};">${bodyHtml}</p>
              ${
                locationBits
                  ? `<p style="margin:14px 0 0;font-family:${font};font-size:14px;color:${escapeHtml(mutedColor)};">&#128205; ${escapeHtml(locationBits)}</p>`
                  : ''
              }
              <p style="margin:14px 0 0;font-family:${font};font-size:15px;color:${escapeHtml(textColor)};">${escapeHtml(labels.lookForward)}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 8px 0;">
              <a href="${escapeHtml(cardHref)}" style="display:inline-block;font-family:${font};font-size:13px;font-weight:bold;letter-spacing:0.06em;color:${escapeHtml(ctaTextColor)};background-color:${escapeHtml(cardColor)};text-decoration:none;padding:14px 36px;border-radius:999px;">${escapeHtml(viewCard)}</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 0 0;">
              <a href="${escapeHtml(cardHref)}" style="text-decoration:none;color:inherit;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:400px;background-color:${escapeHtml(cardColor)};border-radius:2px;">
                  <tr>
                    <td width="*" style="font-size:0;line-height:0;">&nbsp;</td>
                    ${sealCell}
                  </tr>
                  <tr>
                    <td colspan="2" align="center" style="padding:40px 24px 48px;font-family:${font};font-size:28px;font-weight:bold;color:${escapeHtml(cardTextColor)};line-height:1.2;">
                      ${escapeHtml(familyName || title)}
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 8px 0;">
              <p style="margin:0;font-family:${font};font-size:20px;font-weight:bold;color:${escapeHtml(titleColor)};">${escapeHtml(title)}</p>
              ${
                hostLine
                  ? `<p style="margin:8px 0 0;font-family:${font};font-size:14px;color:${escapeHtml(mutedColor)};">${escapeHtml(hostLine)}</p>`
                  : ''
              }
            </td>
          </tr>
          ${
            detailRows.length
              ? `<tr><td style="padding:24px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #e5e5e5;">${detailRows.join('<tr><td colspan="3" style="border-top:1px solid #e5e5e5;font-size:0;height:1px;">&nbsp;</td></tr>')}</table></td></tr>`
              : ''
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  const preview = escapeHtml(previewMessage(body)).replace(/\n/g, ' ')
  const primaryHref = followUp.type === 'message' ? messagesHref : cardHref
  const primaryLabel = followUp.type === 'message' ? labels.viewMessage : labels.viewInvitation
  const secondaryHref = followUp.type === 'message' ? cardHref : messagesHref
  const secondaryLabel = followUp.type === 'message' ? labels.viewInvitation : labels.viewMessages

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;${pageBgCss}font-family:${font};" dir="${dir}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${pageBgCss}">
    <tr>
      <td align="center" style="padding:40px 16px 56px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.3;color:${escapeHtml(titleColor)};">${escapeHtml(headline)}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 8px 0;">
              <p style="margin:0;font-family:${font};font-size:16px;font-weight:bold;color:${escapeHtml(textColor)};">${escapeHtml(title)}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 8px 0;">
              <p style="margin:0;font-family:${font};font-size:15px;line-height:1.5;color:${escapeHtml(mutedColor)};font-style:italic;">&ldquo;${preview}&rdquo;</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 8px 0;">
              <a href="${escapeHtml(primaryHref)}" style="display:inline-block;font-family:${font};font-size:14px;font-weight:bold;color:${escapeHtml(ctaTextColor)};background-color:${escapeHtml(buttonBg)};text-decoration:none;padding:14px 32px;border-radius:999px;">${escapeHtml(primaryLabel)}</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 8px 0;">
              <a href="${escapeHtml(secondaryHref)}" style="font-family:${font};font-size:14px;color:${escapeHtml(textColor)};text-decoration:underline;">${escapeHtml(secondaryLabel)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
