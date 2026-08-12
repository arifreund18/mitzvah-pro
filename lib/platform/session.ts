import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isValidSession, SESSION_COOKIE } from '@/lib/platform/auth'

export async function requireSession(): Promise<NextResponse | null> {
  const jar = await cookies()
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  return null
}
