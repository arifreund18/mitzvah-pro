import { createHmac, timingSafeEqual } from 'node:crypto'
import { DEFAULT_ORG_ID } from './constants.ts'

export const SESSION_COOKIE = 'mitzvah_session'
export { DEFAULT_ORG_ID }
/** Signed session lifetime (matches cookie maxAge). */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

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

/** M7: Preview (or any non-prod) with a real DATABASE_URL must not use default secrets. */
function requireSecretsWithDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL) && process.env.MITZVAH_ALLOW_DEFAULT_SECRETS !== '1'
}

/**
 * N7: refuse predictable fallbacks. Login catches and returns 503.
 * Do not derive admin passwords from commit SHA / VERCEL_URL.
 */
export function dashboardPassword(): string {
  const value = process.env.DASHBOARD_PASSWORD
  if (value) return value
  if (isProductionEnv() || requireSecretsWithDatabase()) {
    throw new Error('DASHBOARD_PASSWORD is required in production (and Preview with DATABASE_URL)')
  }
  return 'mitzvah'
}

export function sessionSecret(): string {
  const value = process.env.DASHBOARD_SECRET
  if (value) return value
  if (isProductionEnv() || requireSecretsWithDatabase()) {
    throw new Error('DASHBOARD_SECRET is required in production (and Preview with DATABASE_URL)')
  }
  return 'mitzvah-local-secret'
}

/** True when admin login secrets are present (ops check / health). */
export function dashboardSecretsConfigured(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD?.trim() && process.env.DASHBOARD_SECRET?.trim())
}

/** Safe for build/seed paths — never throws. */
export function sessionSecretOrFallback(): string {
  try {
    return sessionSecret()
  } catch {
    return `unconfigured-${process.env.VERCEL_GIT_COMMIT_SHA || 'build'}`
  }
}

function signPayload(payload: string): string {
  return createHmac('sha256', sessionSecretOrFallback()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function verifySigned(value: string): string | null {
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  if (!payload || !sig) return null
  const expected = signPayload(payload)
  if (!safeEqual(expected, sig)) return null
  return payload
}

function sessionExpiryUnix(): number {
  return Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
}

function parseExpiry(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null
  const exp = Number(raw)
  if (!Number.isFinite(exp)) return null
  return exp
}

/**
 * Platform-admin cookie: `a.<exp>.<hmac>`.
 * Not derived from the password (avoids brute-forcing a short hash of the password).
 */
export function sessionToken(): string {
  const password = process.env.DASHBOARD_PASSWORD
  if (!password && isProductionEnv()) {
    // Expired payload — unusable until DASHBOARD_PASSWORD is set (login still refuses).
    const payload = 'a.0'
    return `${payload}.${signPayload(payload)}`
  }
  const payload = `a.${sessionExpiryUnix()}`
  return `${payload}.${signPayload(payload)}`
}

export type SessionActor =
  | { kind: 'admin'; orgId: string; role: 'platform_admin' }
  | { kind: 'user'; userId: string; orgId: string; role: 'org_owner' | 'org_member' | 'platform_admin' }

/**
 * User cookie: `u.<userId>.<orgId>.<role>.<exp>.<hmac>`.
 * Role/org in the cookie are hints only — `currentActor()` reloads them from the DB.
 */
export function encodeUserSession(userId: string, orgId: string, role: SessionActor['role']): string {
  const payload = `u.${userId}.${orgId}.${role}.${sessionExpiryUnix()}`
  return `${payload}.${signPayload(payload)}`
}

export function readSession(value: string | undefined | null): SessionActor | null {
  if (!value) return null

  // Legacy fnv1a cookies (8 hex chars) are rejected — rotate DASHBOARD_SECRET on deploy.
  const payload = verifySigned(value)
  if (!payload) return null

  if (payload.startsWith('a.')) {
    const parts = payload.split('.')
    if (parts.length !== 2) return null
    const exp = parseExpiry(parts[1])
    if (exp === null || exp < Math.floor(Date.now() / 1000)) return null
    return { kind: 'admin', orgId: DEFAULT_ORG_ID, role: 'platform_admin' }
  }

  if (!payload.startsWith('u.')) return null
  const parts = payload.split('.')
  // u / userId / orgId / role / exp  — userId is a UUID (no dots)
  if (parts.length !== 5) return null
  const [, userId, orgId, role, expRaw] = parts
  if (!userId || !orgId) return null
  if (role !== 'org_owner' && role !== 'org_member' && role !== 'platform_admin') return null
  const exp = parseExpiry(expRaw)
  if (exp === null || exp < Math.floor(Date.now() / 1000)) return null
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

/** Owners (and platform admins) can change event products and enabled languages. */
export function canManageEventOptions(actor: SessionActor | null): boolean {
  return canManageUsers(actor)
}
