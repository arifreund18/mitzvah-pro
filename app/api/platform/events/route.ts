import { NextResponse } from 'next/server'
import { actorAllowedEventIds, actorSeesAllOrgEvents } from '@/lib/platform/access'
import { actorOrgId, currentActor, requireSession } from '@/lib/platform/session'
import { resolveLocales } from '@/lib/platform/locales'
import { platformApiError } from '@/lib/platform/api-error'
import { createEvent, getUser, listEvents } from '@/lib/platform/store'

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied
  const actor = await currentActor()
  const user = actor?.kind === 'user' ? await getUser(actor.userId) : null
  const eventIds = actorSeesAllOrgEvents(actor) ? null : actorAllowedEventIds(actor, user)
  const events = await listEvents(actorOrgId(actor), eventIds)
  return NextResponse.json({ events })
}

export async function POST(request: Request) {
  const denied = await requireSession()
  if (denied) return denied
  const actor = await currentActor()
  if (!actorSeesAllOrgEvents(actor)) {
    return NextResponse.json({ error: 'Sem permissão para criar eventos' }, { status: 403 })
  }
  const body = (await request.json().catch(() => null)) as {
    honoreeName?: string
    familyName?: string
    locale?: string
    enabled?: string[]
    productMode?: string
  } | null
  const honoreeName = body?.honoreeName?.trim()
  const familyName = body?.familyName?.trim()
  const locales = resolveLocales(body?.enabled, body?.locale)
  const productMode = body?.productMode === 'invite_only' ? 'invite_only' : 'site'
  if (!honoreeName) {
    return NextResponse.json({ error: 'Informe o nome do celebrante' }, { status: 400 })
  }
  try {
    const event = await createEvent({
      honoreeName,
      familyName: familyName || honoreeName,
      locale: locales.default,
      enabled: locales.enabled,
      orgId: actor?.orgId,
      productMode,
    })
    return NextResponse.json({ event })
  } catch (error) {
    return platformApiError(error, 'Não foi possível criar o evento')
  }
}
