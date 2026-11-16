export type SheetsIdParts = {
  kind: 'id' | 'published'
  id: string
  gid: string | null
}

/** Parse a Google Sheets share/edit/publish URL into id + gid. */
export function parseGoogleSheetsUrl(input: string): SheetsIdParts | null {
  const raw = input.trim()
  if (!raw) return null

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  if (!/(^|\.)docs\.google\.com$/i.test(url.hostname)) return null

  const gid =
    url.searchParams.get('gid') ||
    (url.hash.match(/gid=(\d+)/i) || [])[1] ||
    null

  const published = url.pathname.match(/\/spreadsheets\/d\/e\/([^/]+)/i)
  if (published) {
    return { kind: 'published', id: published[1], gid }
  }

  const edited = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i)
  if (edited && edited[1] !== 'e') {
    return { kind: 'id', id: edited[1], gid }
  }

  return null
}

/** Candidate CSV download URLs. gviz is more reliable for “anyone with the link”. */
export function googleSheetsCsvCandidateUrls(input: string): string[] {
  const parts = parseGoogleSheetsUrl(input)
  if (!parts) return []

  const gid = parts.gid || '0'
  const urls: string[] = []

  if (parts.kind === 'published') {
    const pub = new URL(`https://docs.google.com/spreadsheets/d/e/${parts.id}/pub`)
    pub.searchParams.set('output', 'csv')
    if (parts.gid) pub.searchParams.set('gid', parts.gid)
    urls.push(pub.toString())
    return urls
  }

  // Preferred for link-shared (viewer) sheets — avoids many /export 400s.
  const gviz = new URL(`https://docs.google.com/spreadsheets/d/${parts.id}/gviz/tq`)
  gviz.searchParams.set('tqx', 'out:csv')
  gviz.searchParams.set('gid', gid)
  urls.push(gviz.toString())

  const gvizDefault = new URL(`https://docs.google.com/spreadsheets/d/${parts.id}/gviz/tq`)
  gvizDefault.searchParams.set('tqx', 'out:csv')
  urls.push(gvizDefault.toString())

  const exported = new URL(`https://docs.google.com/spreadsheets/d/${parts.id}/export`)
  exported.searchParams.set('format', 'csv')
  exported.searchParams.set('gid', gid)
  urls.push(exported.toString())

  return [...new Set(urls)]
}

/** @deprecated Prefer googleSheetsCsvCandidateUrls; kept for older tests/callers. */
export function googleSheetsCsvExportUrl(input: string): string | null {
  return googleSheetsCsvCandidateUrls(input)[0] || null
}

function looksLikeHtml(text: string): boolean {
  return /<!doctype html|<html/i.test(text.slice(0, 200))
}

function errorForStatus(status: number): string {
  if (status === 401 || status === 403) {
    return 'Folha privada. Partilhe como “Qualquer pessoa com o link” (leitor) ou publique na web.'
  }
  if (status === 404) {
    return 'Folha não encontrada. Confirme o URL do Google Sheets.'
  }
  if (status === 400) {
    return 'Google recusou a exportação (400). Confirme o link da folha (não só da pasta) e tente de novo.'
  }
  return `Google Sheets respondeu ${status}`
}

export async function fetchGoogleSheetsCsv(
  sheetUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ csv: string } | { error: string }> {
  const candidates = googleSheetsCsvCandidateUrls(sheetUrl)
  if (!candidates.length) {
    return { error: 'URL do Google Sheets inválida' }
  }

  let lastError = 'Não foi possível ler o Google Sheets'
  for (const exportUrl of candidates) {
    let res: Response
    try {
      res = await fetchImpl(exportUrl, {
        redirect: 'follow',
        headers: {
          Accept: 'text/csv,text/plain,*/*',
          // Some Google endpoints 400 anonymous requests without a UA.
          'User-Agent':
            'Mozilla/5.0 (compatible; MitzvahPro/1.0; +https://mitzvah.pro)',
        },
      })
    } catch {
      lastError = 'Não foi possível contactar o Google Sheets'
      continue
    }

    if (!res.ok) {
      lastError = errorForStatus(res.status)
      continue
    }

    const csv = await res.text()
    if (!csv.trim()) {
      lastError = 'A folha CSV veio vazia'
      continue
    }
    if (looksLikeHtml(csv)) {
      lastError =
        'A folha não devolveu CSV. Confirme partilha pública ou File → Share → Publish to web (CSV).'
      continue
    }
    return { csv }
  }

  return { error: lastError }
}
