/** SES config set names: up to 64 chars, [A-Za-z0-9_-] only. */
export function eventConfigurationSetName(slug: string, eventId?: string): string {
  const clean = (slug || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  // E8: include a short event id so long/reused slugs do not collide.
  if (eventId) {
    const short = eventId.replace(/-/g, '').slice(0, 8)
    const base = (clean || 'event').slice(0, 40)
    return `mitzvah-${base}-${short}`.slice(0, 64)
  }
  return `mitzvah-${(clean || 'event').slice(0, 50)}`
}
