export const SESSION_COOKIE = 'mitzvah_session'
export const DEFAULT_ORG_ID = 'org-mitzvah'

function fnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * True for the Vercel Production target (or explicit override).
 * Do NOT use NODE_ENV alone — `next build` always sets NODE_ENV=production
 * and would break preview/local builds if secrets throw at import/seed time.
 */
export function isProductionEnv(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' || process.env.MITZVAH_REQUIRE_SECRETS === '1'
  )
}

export function dashboardPassword(): string {
  const value = process.env.DASHBOARD_PASSWORD
  if (value) return value
  if (isProductionEnv()) {
    throw new Error('DASHBOARD_PASSWORD is required in production')
  }
  return 'mitzvah'
}

export function sessionSecret(): string {
  const value = process.env.DASHBOARD_SECRET
  if (value) return value
  if (isProductionEnv()) {
    throw new Error('DASHBOARD_SECRET is required in production')
  }
  return 'mitzvah-local-secret'
}

/** Safe for build/seed paths — never throws. */
export function sessionSecretOrFallback(): string {
  try {
    return sessionSecret()
  } catch {
    return `unconfigured-${process.env.VERCEL_GIT_COMMIT_SHA || 'build'}`
  }
}

export function sessionToken(): string {
  const secret = sessionSecretOrFallback()
  const password = process.env.DASHBOARD_PASSWORD
  if (!password && isProductionEnv()) {
    // Unusable token when password missing — login route still refuses admin login.
    return fnv1a(`${secret}:unconfigured-admin:v1`)
  }
  return fnv1a(`${secret}:${password || dashboardPassword()}:v1`)
}

export type SessionActor =
  | { kind: 'admin'; orgId: string; role: 'platform_admin' }
  | { kind: 'user'; userId: string; orgId: string; role: 'org_owner' | 'org_member' | 'platform_admin' }

export function encodeUserSession(userId: string, orgId: string, role: SessionActor['role']): string {
  const payload = `u.${userId}.${orgId}.${role}`
  return `${payload}.${fnv1a(`${sessionSecretOrFallback()}:${payload}`)}`
}

export function readSession(value: string | undefined | null): SessionActor | null {
  if (!value) return null
  const adminToken = sessionToken()
  if (adminToken && value === adminToken) {
    return { kind: 'admin', orgId: DEFAULT_ORG_ID, role: 'platform_admin' }
  }
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const sig = value.slice(dot + 1)
  const payload = value.slice(0, dot)
  if (!payload.startsWith('u.')) return null
  if (fnv1a(`${sessionSecretOrFallback()}:${payload}`) !== sig) return null
  const parts = payload.split('.')
  if (parts.length !== 4) return null
  const [, userId, orgId, role] = parts
  if (role !== 'org_owner' && role !== 'org_member' && role !== 'platform_admin') return null
  return { kind: 'user', userId, orgId, role }
}

export function isValidSession(value: string | undefined | null): boolean {
  return readSession(value) !== null
}

export function isPlatformAdmin(actor: SessionActor | null): boolean {
  return actor?.role === 'platform_admin'
}

export function canManageUsers(actor: SessionActor | null): boolean {
  return isPlatformAdmin(actor) || actor?.role === 'org_owner'
}
