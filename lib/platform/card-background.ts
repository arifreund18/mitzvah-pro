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
