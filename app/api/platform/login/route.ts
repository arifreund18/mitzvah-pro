import { NextResponse } from 'next/server'
import { dashboardPassword, SESSION_COOKIE, sessionToken } from '@/lib/platform/auth'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null
  if (!body?.password || body.password !== dashboardPassword()) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
