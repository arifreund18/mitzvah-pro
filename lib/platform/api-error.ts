import { NextResponse } from 'next/server'
import { EPHEMERAL_STORAGE_ERROR } from './persistence'

export function platformApiError(error: unknown, fallback = 'Falha interna') {
  const message = error instanceof Error ? error.message : fallback
  if (message === EPHEMERAL_STORAGE_ERROR || message.includes('Persistência efêmera')) {
    return NextResponse.json({ error: EPHEMERAL_STORAGE_ERROR, code: 'ephemeral_storage' }, { status: 503 })
  }
  console.error('[platform]', error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
