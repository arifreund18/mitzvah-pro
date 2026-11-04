import * as XLSX from 'xlsx'
import {
  guestsToImportRows,
  IMPORT_COLUMNS,
  parseGuestImportRows,
  type GuestImportPreview,
  type GuestImportRow,
} from './csv'
import type { Guest } from './types'

function sheetToRows(sheet: XLSX.WorkSheet): GuestImportRow[] {
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })
  return json.map((row) => {
    const normalized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      const k = key
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
      normalized[k] = value
    }
    return {
      family_name: String(
        normalized.family_name ?? normalized.familyname ?? normalized.familia ?? normalized.name ?? '',
      ),
      email: String(normalized.email ?? ''),
      guest_name: String(
        normalized.guest_name ?? normalized.guestname ?? normalized.convidado ?? '',
      ),
      type: String(normalized.type ?? normalized.tipo ?? 'adult'),
      notes: String(normalized.notes ?? normalized.notas ?? normalized.message ?? ''),
      language: String(
        normalized.language ??
          normalized.locale ??
          normalized.invitelocale ??
          normalized.invite_locale ??
          '',
      ),
    }
  })
}

export function parseGuestXlsx(buffer: ArrayBuffer | Buffer | Uint8Array): GuestImportPreview {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const first = workbook.SheetNames[0]
  if (!first) {
    return { preview: [], errors: ['Planilha vazia'], duplicates: [], guests: [] }
  }
  const sheet = workbook.Sheets[first]
  if (!sheet) {
    return { preview: [], errors: ['Planilha vazia'], duplicates: [], guests: [] }
  }
  return parseGuestImportRows(sheetToRows(sheet))
}

export function exportGuestXlsx(guests: Guest[]): Buffer {
  const rows = guestsToImportRows(guests)
  const data = [
    [...IMPORT_COLUMNS],
    ...rows.map((row) =>
      IMPORT_COLUMNS.map((col) => row[col]),
    ),
  ]
  const sheet = XLSX.utils.aoa_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'convidados')
  const out = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return out
}

export function decodeBase64File(base64: string): Buffer {
  const cleaned = base64.includes(',') ? base64.split(',').pop() || '' : base64
  return Buffer.from(cleaned, 'base64')
}
