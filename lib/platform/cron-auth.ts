import { isProductionEnv } from '@/lib/platform/auth'

/** Require Bearer CRON_SECRET in production; allow open access only outside production when unset. */
export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return !isProductionEnv()
  }
  const header = request.headers.get('authorization') || ''
  return header === `Bearer ${secret}`
}

/** M3: dashboard cookie session OR cron bearer (mail job resume). */
export function isCronBearer(request: Request): boolean {
  return authorizeCron(request)
}
