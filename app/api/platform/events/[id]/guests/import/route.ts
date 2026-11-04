import { NextResponse } from 'next/server'
import {
  guestFromImportRow,
  parseGuestCsvPreview,
  parseGuestImportRows,
  type GuestImportRow,
} from '@/lib/platform/csv'
import { decodeBase64File, parseGuestXlsx } from '@/lib/platform/xlsx-guests'
import { addGuests, getEvent } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import type { Guest } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

function isXlsxName(name: string): boolean {
  return /\.xlsx?$/i.test(name)
}

function wantsPreview(request: Request, body: Record<string, unknown> | null): boolean {
  const url = new URL(request.url)
  const q = url.searchParams.get('preview')
  if (q === '1' || q === 'true') return true
  if (q === '0' || q === 'false') return false
  if (body && body.confirm === true) return false
  if (body && body.preview === true) return true
  // Rows without confirm → preview only
  if (body && Array.isArray(body.rows) && body.confirm !== true) return true
  return false
}

async function readImportPayload(request: Request): Promise<{
  previewMode: boolean
  parsed: ReturnType<typeof parseGuestCsvPreview> | null
  confirmRows: GuestImportRow[] | null
  error?: string
}> {
  const contentType = request.headers.get('content-type') || ''
  const url = new URL(request.url)

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    const confirm = String(form.get('confirm') || '') === 'true' || form.get('confirm') === '1'
    const previewFlag =
      url.searchParams.get('preview') === '1' ||
      url.searchParams.get('preview') === 'true' ||
      String(form.get('preview') || '') === '1' ||
      String(form.get('preview') || '') === 'true'
    const previewMode = confirm ? false : previewFlag || url.searchParams.get('preview') !== '0'
    // multipart defaults to preview unless preview=0 or confirm

    if (file && typeof file === 'object' && 'arrayBuffer' in file) {
      const blob = file as File
      const name = blob.name || ''
      const buffer = Buffer.from(await blob.arrayBuffer())
      if (isXlsxName(name) || contentType.includes('spreadsheet')) {
        return { previewMode, parsed: parseGuestXlsx(buffer), confirmRows: null }
      }
      const text = buffer.toString('utf8')
      return { previewMode, parsed: parseGuestCsvPreview(text), confirmRows: null }
    }
    const csv = String(form.get('csv') || '')
    if (csv) return { previewMode, parsed: parseGuestCsvPreview(csv), confirmRows: null }
    return { previewMode, parsed: null, confirmRows: null, error: 'Arquivo ou CSV ausente' }
  }

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    const csv = await request.text()
    const previewMode = url.searchParams.get('preview') === '1'
    return { previewMode, parsed: parseGuestCsvPreview(csv), confirmRows: null }
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const previewMode = wantsPreview(request, body)

  if (body?.rows && Array.isArray(body.rows)) {
    const rows = body.rows as GuestImportRow[]
    if (body.confirm === true || url.searchParams.get('preview') === '0') {
      return { previewMode: false, parsed: parseGuestImportRows(rows), confirmRows: rows }
    }
    return { previewMode: true, parsed: parseGuestImportRows(rows), confirmRows: null }
  }

  if (typeof body?.base64 === 'string') {
    const buffer = decodeBase64File(body.base64)
    const filename = String(body.filename || body.name || '')
    if (isXlsxName(filename) || body.format === 'xlsx') {
      return { previewMode, parsed: parseGuestXlsx(buffer), confirmRows: null }
    }
    return {
      previewMode,
      parsed: parseGuestCsvPreview(buffer.toString('utf8')),
      confirmRows: null,
    }
  }

  if (typeof body?.csv === 'string') {
    return { previewMode, parsed: parseGuestCsvPreview(body.csv), confirmRows: null }
  }

  return { previewMode, parsed: null, confirmRows: null, error: 'CSV/XLSX ausente' }
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied
  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const payload = await readImportPayload(request)
  if (payload.error) {
    return NextResponse.json({ error: payload.error }, { status: 400 })
  }
  const parsed = payload.parsed
  if (!parsed || parsed.preview.length === 0) {
    return NextResponse.json(
      {
        error: 'Arquivo vazio ou sem coluna de nome',
        preview: [],
        errors: parsed?.errors || [],
        duplicates: parsed?.duplicates || [],
      },
      { status: 400 },
    )
  }

  // Detect duplicates against existing guests by email
  const existingEmails = new Set(
    event.guests.map((guest) => guest.email.trim().toLowerCase()).filter(Boolean),
  )
  const existingDupes = parsed.preview
    .map((row, i) => {
      const email = row.email.trim().toLowerCase()
      if (email && existingEmails.has(email)) {
        return `Linha ${i + 1}: email já existe (${row.email})`
      }
      return null
    })
    .filter((item): item is string => Boolean(item))
  const duplicates = [...parsed.duplicates, ...existingDupes]

  if (payload.previewMode) {
    return NextResponse.json({
      preview: parsed.preview,
      errors: parsed.errors,
      duplicates,
    })
  }

  const guests: Guest[] =
    payload.confirmRows?.map((row) => guestFromImportRow(row)) || parsed.guests
  const added = await addGuests(id, guests)
  if (!added) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({
    added: added.length,
    guests: added,
    preview: parsed.preview,
    errors: parsed.errors,
    duplicates,
  })
}
