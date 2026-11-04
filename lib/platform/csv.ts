import { normalizeGuest } from './normalize'
import type { EventLocale, Guest, GuestRsvp, PersonType } from './types'
import { EVENT_LOCALES } from './types'

const HEADER = ['familyName', 'email', 'partySize', 'status', 'meal', 'dietary', 'message'] as const

export const IMPORT_COLUMNS = [
  'family_name',
  'email',
  'guest_name',
  'type',
  'notes',
  'language',
] as const

export type GuestImportRow = {
  family_name: string
  email: string
  guest_name: string
  type: string
  notes: string
  language: string
}

export type GuestImportPreview = {
  preview: GuestImportRow[]
  errors: string[]
  duplicates: string[]
  guests: Guest[]
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else if (ch === '"') {
        quoted = false
      } else {
        current += ch
      }
      continue
    }
    if (ch === '"') {
      quoted = true
      continue
    }
    if (ch === ',') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current.trim())
  return cells
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function asStatus(value: string): GuestRsvp {
  const v = value.trim().toLowerCase()
  if (v === 'yes' || v === 'sim' || v === 'sí' || v === 'si') return 'yes'
  if (v === 'no' || v === 'não' || v === 'nao') return 'no'
  return 'pending'
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function headerIndex(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias)
    if (idx >= 0) return idx
  }
  return -1
}

function asLocale(value: string): EventLocale | '' {
  const v = value.trim().toLowerCase()
  if ((EVENT_LOCALES as readonly string[]).includes(v)) return v as EventLocale
  if (v === 'pt-br' || v === 'portuguese' || v === 'portugues' || v === 'português') return 'pt'
  if (v === 'en-us' || v === 'english' || v === 'ingles' || v === 'inglês') return 'en'
  if (v === 'es-es' || v === 'spanish' || v === 'espanol' || v === 'español') return 'es'
  if (v === 'he-il' || v === 'hebrew' || v === 'hebraico' || v === 'עברית') return 'he'
  return ''
}

function asPersonType(value: string): PersonType {
  const v = value.trim().toLowerCase()
  if (v === 'child' || v === 'crianca' || v === 'criança' || v === 'kid' || v === 'filho') {
    return 'child'
  }
  return 'adult'
}

function rowFromCells(
  cells: string[],
  index: Record<keyof GuestImportRow, number>,
): GuestImportRow | null {
  const family_name =
    (index.family_name >= 0 ? cells[index.family_name] : '') ||
    (index.guest_name >= 0 ? cells[index.guest_name] : '') ||
    cells[0] ||
    ''
  if (!family_name.trim()) return null
  return {
    family_name: family_name.trim(),
    email: (index.email >= 0 ? cells[index.email] : cells[1] || '').trim(),
    guest_name: (index.guest_name >= 0 ? cells[index.guest_name] : '').trim(),
    type: (index.type >= 0 ? cells[index.type] : 'adult').trim() || 'adult',
    notes: (index.notes >= 0 ? cells[index.notes] : '').trim(),
    language: (index.language >= 0 ? cells[index.language] : '').trim(),
  }
}

function detectIndexes(headers: string[]): Record<keyof GuestImportRow, number> {
  return {
    family_name: headerIndex(headers, [
      'family_name',
      'familyname',
      'familia',
      'família',
      'name',
      'nome',
    ]),
    email: headerIndex(headers, ['email', 'e_mail', 'mail']),
    guest_name: headerIndex(headers, [
      'guest_name',
      'guestname',
      'convidado',
      'person',
      'pessoa',
    ]),
    type: headerIndex(headers, ['type', 'tipo', 'person_type']),
    notes: headerIndex(headers, ['notes', 'note', 'notas', 'obs', 'message', 'mensagem']),
    language: headerIndex(headers, [
      'language',
      'locale',
      'invitelocale',
      'invite_locale',
      'idioma',
      'lang',
    ]),
  }
}

export function guestFromImportRow(row: GuestImportRow): Guest {
  const locale = asLocale(row.language)
  const guestName = row.guest_name || row.family_name
  return normalizeGuest({
    familyName: row.family_name,
    email: row.email,
    notes: row.notes,
    ...(locale ? { inviteLocale: locale } : {}),
    people: [
      {
        name: guestName,
        type: asPersonType(row.type),
        status: 'pending' as const,
        meal: '',
        dietary: '',
      },
    ] as Guest['people'],
  })
}

export function parseGuestImportRows(
  rows: Array<Partial<GuestImportRow> | Record<string, unknown>>,
): GuestImportPreview {
  const preview: GuestImportRow[] = []
  const errors: string[] = []
  const duplicates: string[] = []
  const seen = new Set<string>()
  const guests: Guest[] = []

  rows.forEach((raw, i) => {
    const line = i + 1
    const bag = raw as Record<string, unknown>
    const row: GuestImportRow = {
      family_name: String(bag.family_name ?? bag.familyName ?? '').trim(),
      email: String(bag.email ?? '').trim(),
      guest_name: String(bag.guest_name ?? bag.guestName ?? '').trim(),
      type: String(bag.type ?? 'adult').trim() || 'adult',
      notes: String(bag.notes ?? '').trim(),
      language: String(bag.language ?? bag.inviteLocale ?? '').trim(),
    }
    if (!row.family_name) {
      errors.push(`Linha ${line}: family_name obrigatório`)
      return
    }
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push(`Linha ${line}: email inválido (${row.email})`)
    }
    if (row.language && !asLocale(row.language)) {
      errors.push(`Linha ${line}: language inválido (${row.language})`)
    }
    const key = `${row.email.toLowerCase()}|${row.family_name.toLowerCase()}`
    if (row.email && seen.has(key)) {
      duplicates.push(`Linha ${line}: duplicado ${row.email} / ${row.family_name}`)
    } else if (row.email) {
      seen.add(key)
    }
    preview.push(row)
    guests.push(guestFromImportRow(row))
  })

  return { preview, errors, duplicates, guests }
}

export function parseGuestCsv(text: string): Guest[] {
  return parseGuestCsvPreview(text).guests
}

export function parseGuestCsvPreview(text: string): GuestImportPreview {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) {
    return { preview: [], errors: ['CSV vazio'], duplicates: [], guests: [] }
  }
  const header = splitCsvLine(lines[0]).map(normalizeHeader)
  const hasHeader = header.some((cell) =>
    [
      'family_name',
      'familyname',
      'familia',
      'família',
      'name',
      'nome',
      'email',
      'guest_name',
      'guestname',
    ].includes(cell),
  )
  const dataLines = hasHeader ? lines.slice(1) : lines
  const index = hasHeader
    ? detectIndexes(header)
    : {
        family_name: 0,
        email: 1,
        guest_name: 2,
        type: 3,
        notes: 4,
        language: 5,
      }

  // Legacy CSV shape: familyName,email,partySize,status,meal,dietary,message
  const legacy =
    hasHeader &&
    (header.includes('partysize') ||
      header.includes('status') ||
      header.includes('meal') ||
      header.includes('dietary'))

  if (legacy) {
    const legacyIndex = {
      familyName: Math.max(
        header.indexOf('familyname'),
        header.indexOf('family_name'),
        header.indexOf('familia'),
        header.indexOf('família'),
        header.indexOf('name'),
        header.indexOf('nome'),
        0,
      ),
      email: Math.max(header.indexOf('email'), 1),
      partySize: Math.max(header.indexOf('partysize'), header.indexOf('pessoas'), 2),
      status: Math.max(header.indexOf('status'), header.indexOf('rsvp'), 3),
      meal: Math.max(header.indexOf('meal'), header.indexOf('refeicao'), 4),
      dietary: Math.max(header.indexOf('dietary'), header.indexOf('restricao'), 5),
      message: Math.max(header.indexOf('message'), header.indexOf('mensagem'), header.indexOf('notes'), 6),
      language: Math.max(header.indexOf('language'), header.indexOf('invitelocale'), header.indexOf('locale'), -1),
    }
    const rawRows: GuestImportRow[] = []
    for (const line of dataLines) {
      const cells = splitCsvLine(line)
      const familyName = cells[legacyIndex.familyName] || cells[0] || ''
      if (!familyName) continue
      rawRows.push({
        family_name: familyName,
        email: cells[legacyIndex.email] || '',
        guest_name: familyName,
        type: 'adult',
        notes: cells[legacyIndex.message] || '',
        language: legacyIndex.language >= 0 ? cells[legacyIndex.language] || '' : '',
      })
    }
    // Preserve legacy partySize/status/meal/dietary by rebuilding guests after preview parse
    const preview = parseGuestImportRows(rawRows)
    preview.guests = dataLines
      .map((line) => {
        const cells = splitCsvLine(line)
        const familyName = cells[legacyIndex.familyName] || cells[0] || ''
        if (!familyName) return null
        return normalizeGuest({
          familyName,
          email: cells[legacyIndex.email] || '',
          partySize: Number(cells[legacyIndex.partySize] || 1) || 1,
          status: asStatus(cells[legacyIndex.status] || ''),
          meal: cells[legacyIndex.meal] || '',
          dietary: cells[legacyIndex.dietary] || '',
          message: cells[legacyIndex.message] || '',
          notes: cells[legacyIndex.message] || '',
          inviteLocale: asLocale(legacyIndex.language >= 0 ? cells[legacyIndex.language] || '' : '') || undefined,
        })
      })
      .filter((row): row is Guest => Boolean(row))
    return preview
  }

  const rawRows: GuestImportRow[] = []
  for (const line of dataLines) {
    const cells = splitCsvLine(line)
    const row = rowFromCells(cells, index)
    if (row) rawRows.push(row)
  }
  return parseGuestImportRows(rawRows)
}

export function exportGuestCsv(guests: Guest[]): string {
  const lines = [HEADER.join(',')]
  for (const guest of guests) {
    lines.push(
      [
        csvCell(guest.familyName),
        csvCell(guest.email),
        String(guest.partySize),
        guest.status,
        csvCell(guest.meal),
        csvCell(guest.dietary),
        csvCell(guest.message),
      ].join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

export function guestsToImportRows(guests: Guest[]): GuestImportRow[] {
  return guests.map((guest) => ({
    family_name: guest.familyName,
    email: guest.email,
    guest_name: guest.people[0]?.name || guest.familyName,
    type: guest.people[0]?.type || 'adult',
    notes: guest.notes || guest.message || '',
    language: guest.inviteLocale || '',
  }))
}
