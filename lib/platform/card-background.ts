import type { CardDesign } from '@/lib/platform/types'

export type PageBackgroundStyle = {
  backgroundColor: string
  backgroundImage?: string
  backgroundSize?: string
  backgroundPosition?: string
  backgroundRepeat?: string
}

/** Background for the email/envelope “page” behind the card (pageColor + optional pageTexture). */
export function pageBackgroundStyle(design: CardDesign | undefined): PageBackgroundStyle {
  const pageColor = design?.pageColor || '#1a2033'
  const pageTexture = design?.pageTexture?.trim()
  if (pageTexture) {
    return {
      backgroundColor: pageColor,
      backgroundImage: `url(${pageTexture})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }
  return { backgroundColor: pageColor }
}

/** Only remote http(s) textures belong in outbound email HTML — data: URLs blow past client size limits and break rendering (Gmail shows raw source). */
export function isEmailSafeImageUrl(value: string | undefined | null): boolean {
  const url = value?.trim() || ''
  return /^https?:\/\//i.test(url)
}

/** Inline CSS for HTML email body background (pageColor + optional remote pageTexture). */
export function pageBackgroundCss(
  design: Pick<CardDesign, 'pageColor' | 'pageTexture'> | undefined,
  escapeHtml: (value: string) => string,
): string {
  const pageColor = design?.pageColor || '#1a2033'
  const pageTexture = design?.pageTexture?.trim() || ''
  if (!isEmailSafeImageUrl(pageTexture)) return `background:${escapeHtml(pageColor)};`
  const pageTextureCss = escapeHtml(pageTexture).replace(/'/g, '%27').replace(/[\r\n]/g, '')
  return `background-color:${escapeHtml(pageColor)};background-image:url('${pageTextureCss}');background-size:cover;background-position:center;background-repeat:no-repeat;`
}
