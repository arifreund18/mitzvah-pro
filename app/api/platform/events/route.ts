import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
import { resolveLocales } from '@/lib/platform/locales'
import { platformApiError } from '@/lib/platform/api-error'
import { createEvent, listEvents } from '@/lib/platform/store'

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied
  const events = await listEvents()
  return NextResponse.json({ events })
}

export async function POST(request: Request) {
  const denied = await requireSession()
  if (denied) return denied
  const body = (await request.json().catch(() => null)) as {
    honoreeName?: string
    familyName?: string
    locale?: string
    enabled?: string[]
  } | null
  const honoreeName = body?.honoreeName?.trim()
  const familyName = body?.familyName?.trim()
  const locales = resolveLocales(body?.enabled, body?.locale)
  if (!honoreeName) {
    return NextResponse.json({ error: 'Informe o nome do celebrante' }, { status: 400 })
  }
  try {
    const event = await createEvent({
      honoreeName,
      familyName: familyName || honoreeName,
      locale: locales.default,
      enabled: locales.enabled,
    })
    return NextResponse.json({ event })
  } catch (error) {
    return platformApiError(error, 'Não foi possível criar o evento')
  }
}
