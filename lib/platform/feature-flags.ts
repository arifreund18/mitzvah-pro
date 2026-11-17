/**
 * Feature flags for Neon transfer optimizations.
 * Kept free of heavy persistence imports so unit tests can load this module under node:test.
 */

/** When true, public reads use per-event SQL instead of the full store. Default on for Postgres. */
export function eventScopedReadsEnabled(): boolean {
  if (!process.env.DATABASE_URL) return false
  const raw = process.env.PLATFORM_EVENT_SCOPED_READS
  if (raw === '0' || raw === 'false') return false
  if (raw === '1' || raw === 'true') return true
  return true
}
