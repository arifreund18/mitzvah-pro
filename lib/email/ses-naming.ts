/** SES config set names: up to 64 chars, [A-Za-z0-9_-] only. */
export function eventConfigurationSetName(slug: string): string {
  const clean = (slug || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return `mitzvah-${clean || 'event'}`
}
