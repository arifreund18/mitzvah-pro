import type { EventConfig } from './types.ts'
import { eventPublicUrl } from './site-url.ts'

/** True when the event has a public website guests can land on after RSVP. */
export function eventHasSite(config: EventConfig): boolean {
  return Boolean(config.products?.site ?? config.productMode !== 'invite_only')
}

/**
 * Absolute URL for the start of the event site after a successful RSVP.
 * Returns null for invite-only events (caller should keep the in-place confirmation).
 */
export function rsvpSiteHomeHref(
  config: EventConfig,
  slug: string,
  opts: {
    host: string
    guestToken?: string | null
    locale?: string | null
    langQuery?: string | null
  },
): string | null {
  if (!eventHasSite(config)) return null

  const params = new URLSearchParams()
  if (opts.guestToken) params.set('guest', opts.guestToken)
  if (opts.locale) params.set('lang', opts.locale)
  else if (opts.langQuery) params.set('lang', opts.langQuery)
  const qs = params.toString()
  return eventPublicUrl(slug, qs ? `?${qs}` : '', { host: opts.host })
}
