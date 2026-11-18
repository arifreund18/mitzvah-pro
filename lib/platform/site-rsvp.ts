/** Whether the public event site should surface RSVP nav/CTA/section. */
export function canShowSiteRsvp(opts: {
  mode: 'live' | 'preview'
  guest?: { token?: string } | null
  publicFormEnabled?: boolean
}): boolean {
  if (opts.mode === 'preview') return true
  if (opts.guest) return true
  return Boolean(opts.publicFormEnabled)
}

/** Anchor for RSVP CTAs: real form when available, otherwise the RSVP info section. */
export function siteRsvpAnchor(opts: {
  mode: 'live' | 'preview'
  guest?: { token?: string } | null
  publicFormEnabled?: boolean
}): '#rsvp-form' | '#rsvp' {
  if (opts.guest || (opts.mode === 'live' && opts.publicFormEnabled)) return '#rsvp-form'
  return '#rsvp'
}
