import { NextResponse } from 'next/server'
import {
  dashboardPassword,
  encodeUserSession,
  SESSION_COOKIE,
  sessionToken,
} from '@/lib/platform/auth'
import { findUserByEmail } from '@/lib/platform/store'
import { verifyPassword } from '@/lib/platform/password'
import { consumeRateLimit } from '@/lib/platform/rate-limit'

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: Request) {
  const ip = clientIp(request)
  const limited = await consumeRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
  if (!limited.ok) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Tente mais tarde.' }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string
    password?: string
  } | null
  const password = body?.password || ''
  const email = body?.email?.trim().toLowerCase()

  let token = ''
  if (email) {
    const user = await findUserByEmail(email)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }
    token = encodeUserSession(user.id, user.orgId, user.role)
  } else if (password === dashboardPassword()) {
    token = sessionToken()
  } else {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
