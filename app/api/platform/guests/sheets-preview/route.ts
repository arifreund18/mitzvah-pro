import { NextResponse } from 'next/server'
import { fetchGoogleSheetsCsv } from '@/lib/platform/google-sheets-guests'
import { requireSession } from '@/lib/platform/session'

/** Session-only helper for wizard (no event id yet / local guest draft). */
export async function POST(request: Request) {
  const denied = await requireSession()
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as { sheetUrl?: string } | null
  const sheetUrl = body?.sheetUrl?.trim()
  if (!sheetUrl) {
    return NextResponse.json({ error: 'Informe sheetUrl' }, { status: 400 })
  }

  const fetched = await fetchGoogleSheetsCsv(sheetUrl)
  if ('error' in fetched) {
    return NextResponse.json({ error: fetched.error }, { status: 400 })
  }
  return NextResponse.json({ csv: fetched.csv })
}
