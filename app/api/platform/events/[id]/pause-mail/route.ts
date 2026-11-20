import { NextResponse } from 'next/server'
import { pauseEventSending, resumeEventSending } from '@/lib/email/ses-config-set'
import { canManageEventOptions } from '@/lib/platform/auth'
import { platformApiError } from '@/lib/platform/api-error'
import { currentActor, requireEventAccess } from '@/lib/platform/session'
import { getEvent } from '@/lib/platform/store'

type Ctx = { params: Promise<{ id: string }> }

/**
 * E7: manually pause / resume SES sending for one event via its configuration set.
 * Use when bounce/complaint rates spike; CloudWatch alarm thresholds are documented in docs/SES.md.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const actor = await currentActor()
  if (!canManageEventOptions(actor)) {
    return NextResponse.json(
      { error: 'Só o owner ou admin pode pausar o envio de email.' },
      { status: 403 },
    )
  }

  const body = (await request.json().catch(() => null)) as { pause?: boolean } | null
  const pause = body?.pause !== false

  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const opts = {
    eventId: event.id,
    configurationSetName: event.config.domain.mail?.configurationSetName || undefined,
  }

  try {
    const status = pause
      ? await pauseEventSending(event.slug, opts)
      : await resumeEventSending(event.slug, opts)
    if (!status.exists || status.error) {
      return NextResponse.json(
        {
          error: status.error || 'Configuration set ausente — provisione o email do evento primeiro.',
          status,
        },
        { status: 502 },
      )
    }
    return NextResponse.json({
      ok: true,
      paused: !status.sendingEnabled,
      configurationSet: status,
    })
  } catch (error) {
    return platformApiError(error, 'Não foi possível atualizar o envio de email')
  }
}
