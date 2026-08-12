import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/platform/session'
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
  } | null
  const honoreeName = body?.honoreeName?.trim()
  const familyName = body?.familyName?.trim()
  if (!honoreeName) {
    return NextResponse.json({ error: 'Informe o nome do celebrante' }, { status: 400 })
  }
  const event = await createEvent({ honoreeName, familyName: familyName || honoreeName })
  return NextResponse.json({ event })
}
