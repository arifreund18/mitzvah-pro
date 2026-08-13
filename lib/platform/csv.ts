import { normalizeGuest } from './normalize'
import type { Guest, GuestRsvp } from './types'

const HEADER = ['familyName', 'email', 'partySize', 'status', 'meal', 'dietary', 'message'] as const

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

export function parseGuestCsv(text: string): Guest[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) return []
  const header = splitCsvLine(lines[0]).map((cell) => cell.replace(/\s+/g, '').toLowerCase())
  const hasHeader = header.some((cell) =>
    ['familyname', 'familia', 'família', 'name', 'nome', 'email'].includes(cell),
  )
  const rows = hasHeader ? lines.slice(1) : lines
  const index = {
    familyName: Math.max(header.indexOf('familyname'), header.indexOf('familia'), header.indexOf('família'), header.indexOf('name'), header.indexOf('nome'), 0),
    email: Math.max(header.indexOf('email'), 1),
    partySize: Math.max(header.indexOf('partysize'), header.indexOf('pessoas'), header.indexOf('people'), 2),
    status: Math.max(header.indexOf('status'), header.indexOf('rsvp'), 3),
    meal: Math.max(header.indexOf('meal'), header.indexOf('refeicao'), header.indexOf('refeição'), 4),
    dietary: Math.max(header.indexOf('dietary'), header.indexOf('restricao'), header.indexOf('restrição'), 5),
    message: Math.max(header.indexOf('message'), header.indexOf('mensagem'), 6),
  }
  if (!hasHeader) {
    index.familyName = 0
    index.email = 1
    index.partySize = 2
    index.status = 3
    index.meal = 4
    index.dietary = 5
    index.message = 6
  }
  return rows
    .map((line) => {
      const cells = splitCsvLine(line)
      const familyName = cells[index.familyName] || cells[0] || ''
      if (!familyName) return null
      return normalizeGuest({
        familyName,
        email: cells[index.email] || '',
        partySize: Number(cells[index.partySize] || 1) || 1,
        status: asStatus(cells[index.status] || ''),
        meal: cells[index.meal] || '',
        dietary: cells[index.dietary] || '',
        message: cells[index.message] || '',
      })
    })
    .filter((row): row is Guest => Boolean(row))
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
