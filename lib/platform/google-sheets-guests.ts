/** Turn a Google Sheets share/edit/publish URL into a CSV export URL. */
export function googleSheetsCsvExportUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  if (!/(^|\.)docs\.google\.com$/i.test(url.hostname)) return null

  // Published link: /spreadsheets/d/e/2PACX-.../pub?...
  const published = url.pathname.match(/\/spreadsheets\/d\/e\/([^/]+)/i)
  if (published) {
    const next = new URL(`https://docs.google.com/spreadsheets/d/e/${published[1]}/pub`)
    next.searchParams.set('output', 'csv')
    const gid = url.searchParams.get('gid')
    if (gid) next.searchParams.set('gid', gid)
    return next.toString()
  }

  // Edit/share link: /spreadsheets/d/{id}/...
  const edited = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i)
  if (edited) {
    const id = edited[1]
    if (id === 'e') return null
    const next = new URL(`https://docs.google.com/spreadsheets/d/${id}/export`)
    next.searchParams.set('format', 'csv')
    const gid =
      url.searchParams.get('gid') ||
      (url.hash.match(/gid=(\d+)/i) || [])[1] ||
      '0'
    next.searchParams.set('gid', gid)
    return next.toString()
  }

  return null
}

export async function fetchGoogleSheetsCsv(
  sheetUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ csv: string } | { error: string }> {
  const exportUrl = googleSheetsCsvExportUrl(sheetUrl)
  if (!exportUrl) {
    return { error: 'URL do Google Sheets inválida' }
  }

  let res: Response
  try {
    res = await fetchImpl(exportUrl, {
      redirect: 'follow',
      headers: { Accept: 'text/csv,text/plain,*/*' },
    })
  } catch {
    return { error: 'Não foi possível contactar o Google Sheets' }
  }

  if (!res.ok) {
    return {
      error:
        res.status === 401 || res.status === 403
          ? 'Folha privada. Partilhe como “Qualquer pessoa com o link” (leitor) ou publique na web.'
          : `Google Sheets respondeu ${res.status}`,
    }
  }

  const csv = await res.text()
  if (!csv.trim()) return { error: 'A folha CSV veio vazia' }
  if (/<!doctype html|<html/i.test(csv.slice(0, 200))) {
    return {
      error:
        'A folha não devolveu CSV. Confirme partilha pública ou File → Share → Publish to web (CSV).',
    }
  }
  return { csv }
}
