export const SESSION_COOKIE = 'mitzvah_session'

function fnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function dashboardPassword(): string {
  return process.env.DASHBOARD_PASSWORD || 'mitzvah'
}

export function sessionToken(): string {
  const secret = process.env.DASHBOARD_SECRET || 'mitzvah-local-secret'
  return fnv1a(`${secret}:${dashboardPassword()}:v1`)
}

export function isValidSession(value: string | undefined | null): boolean {
  return Boolean(value) && value === sessionToken()
}
