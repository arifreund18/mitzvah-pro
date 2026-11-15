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

/** Inline CSS for HTML email body background (pageColor + optional pageTexture). */
export function pageBackgroundCss(
  design: Pick<CardDesign, 'pageColor' | 'pageTexture'> | undefined,
  escapeHtml: (value: string) => string,
): string {
  const pageColor = design?.pageColor || '#1a2033'
  const pageTexture = design?.pageTexture?.trim() || ''
  if (!pageTexture) return `background:${escapeHtml(pageColor)};`
  const pageTextureCss = escapeHtml(pageTexture).replace(/'/g, '%27').replace(/[\r\n]/g, '')
  return `background-color:${escapeHtml(pageColor)};background-image:url('${pageTextureCss}');background-size:cover;background-position:center;background-repeat:no-repeat;`
}
