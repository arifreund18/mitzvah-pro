import type { NextRequest } from 'next/server'
import { isProductionEnv } from '@/lib/platform/auth'

/** Require Bearer CRON_SECRET in production; allow open access only outside production when unset. */
export function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return !isProductionEnv()
  }
  const header = request.headers.get('authorization') || ''
  return header === `Bearer ${secret}`
}
