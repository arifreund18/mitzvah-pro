import { NextResponse } from 'next/server'
import { approveEventByToken } from '@/lib/platform/store'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null
  const token = body?.token?.trim()
  if (!token) return NextResponse.json({ error: 'Token em falta' }, { status: 400 })
  const event = await approveEventByToken(token)
  if (!event) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true, event: { id: event.id, status: event.status } })
}
