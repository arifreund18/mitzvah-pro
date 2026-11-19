import type { CardDesign } from './types.ts'
import { apexHost, protocolFor } from './site-url.ts'

export type PageBackgroundStyle = {
  backgroundColor: string
  backgroundImage?: string
  backgroundSize?: string
  backgroundPosition?: string
  backgroundRepeat?: string
}

/** Tile pattern textures like Bar-Beni card pages (full-bleed page background). */
export function pageBackgroundStyle(
  design: CardDesign | undefined,
  textureUrlOverride?: string,
): PageBackgroundStyle {
  const pageColor = design?.pageColor || '#1a2033'
  const pageTexture = (textureUrlOverride || design?.pageTexture || '').trim()
  if (pageTexture) {
    return {
      backgroundColor: pageColor,
      backgroundImage: `url(${pageTexture})`,
      backgroundSize: '160px auto',
      backgroundPosition: 'top center',
      backgroundRepeat: 'repeat',
    }
  }
  return { backgroundColor: pageColor }
}

/** Only remote http(s) textures belong inline in outbound email HTML. */
export function isEmailSafeImageUrl(value: string | undefined | null): boolean {
  const url = value?.trim() || ''
  return /^https?:\/\//i.test(url)
}

export type DesignAssetKind =
  | 'pageTexture'
  | 'envelopeTexture'
  | 'sealUrl'
  | 'cardImageUrl'
  | 'panelPhotoUrl'

/** Absolute URL that serves a design image (including studio data: uploads) for email clients. */
export function designAssetPublicUrl(
  slug: string,
  kind: DesignAssetKind,
  opts: { host: string; surface?: 'invite' | 'std' },
): string {
  const apex = apexHost(opts.host)
  const surface = opts.surface || 'invite'
  return `${protocolFor(apex)}://${apex}/api/platform/e/${encodeURIComponent(slug)}/design-asset?surface=${surface}&kind=${kind}`
}

/** Relative luminance of a #RRGGBB (or #RGB) color; unknown values treated as light. */
export function hexRelativeLuminance(hex: string | undefined | null): number {
  const raw = (hex || '').trim()
  const short = /^#([0-9a-f]{3})$/i.exec(raw)
  const full = /^#([0-9a-f]{6})$/i.exec(raw)
  let n = 0xffffff
  if (full) n = parseInt(full[1], 16)
  else if (short) {
    const s = short[1]
    n = parseInt(`${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`, 16)
  } else return 1
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const r = channel((n >> 16) & 255)
  const g = channel((n >> 8) & 255)
  const b = channel(n & 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function isDarkHex(hex: string | undefined | null): boolean {
  return hexRelativeLuminance(hex) < 0.45
}

/** Pick a readable foreground for a solid background (prefers provided light/dark). */
export function contrastTextOn(
  background: string | undefined | null,
  darkText = '#1c1630',
  lightText = '#f7f1e4',
): string {
  return isDarkHex(background) ? lightText : darkText
}

/** Inline CSS for HTML email body background (pageColor + tiled pageTexture). */
export function pageBackgroundCss(
  design: Pick<CardDesign, 'pageColor' | 'pageTexture'> | undefined,
  escapeHtml: (value: string) => string,
  textureUrlOverride?: string,
): string {
  const pageColor = design?.pageColor || '#1a2033'
  const pageTexture = (textureUrlOverride || design?.pageTexture || '').trim()
  if (!pageTexture || !isEmailSafeImageUrl(pageTexture)) {
    return `background:${escapeHtml(pageColor)};`
  }
  const pageTextureCss = escapeHtml(pageTexture).replace(/'/g, '%27').replace(/[\r\n]/g, '')
  return `background-color:${escapeHtml(pageColor)};background-image:url('${pageTextureCss}');background-size:160px auto;background-position:top center;background-repeat:repeat;`
}
