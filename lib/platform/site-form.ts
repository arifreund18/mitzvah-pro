import type { ThemeId } from './types'

/** Theme-aware input classes so ivory/cream forms stay readable. */
export function siteFieldClass(theme: ThemeId | string | undefined): string {
  if (theme === 'ivory') {
    return 'mt-1 w-full rounded-xl border border-black/25 bg-white px-4 py-3 text-[#241c14] outline-none shadow-sm placeholder:text-black/35 focus:border-[#241c14]/40'
  }
  return 'mt-1 w-full rounded-xl border border-white/40 bg-white/12 px-4 py-3 outline-none placeholder:text-white/35 focus:border-white/70'
}

export function siteSelectClass(theme: ThemeId | string | undefined): string {
  if (theme === 'ivory') {
    return `${siteFieldClass(theme)} [color-scheme:light]`
  }
  return `${siteFieldClass(theme)} bg-[#12182a] [color-scheme:dark] [&>option]:bg-[#12182a] [&>option]:text-white`
}
