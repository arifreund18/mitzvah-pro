import { NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/platform/auth'
import { requireSession } from '@/lib/platform/session'
import { createOrg, listOrgs } from '@/lib/platform/store'

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied
  const orgs = await listOrgs()
  return NextResponse.json({ orgs })
}

export async function POST(request: Request) {
  const denied = await requireSession()
  if (denied) return denied
  const { currentActor } = await import('@/lib/platform/session')
  const actor = await currentActor()
  if (!isPlatformAdmin(actor)) {
    return NextResponse.json({ error: 'Apenas platform admin' }, { status: 403 })
  }
  const body = (await request.json().catch(() => null)) as { name?: string } | null
  const name = body?.name?.trim()
  if (!name) return NextResponse.json({ error: 'Nome da organização obrigatório' }, { status: 400 })
  const org = await createOrg(name)
  return NextResponse.json({ org })
}
