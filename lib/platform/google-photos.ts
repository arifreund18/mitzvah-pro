/**
 * Optional Google Photos album import.
 * Requires GOOGLE_PHOTOS_API_KEY (or GOOGLE_API_KEY) — never touches Bar-Beni.
 */

export type GooglePhotoItem = {
  url: string
  caption: string
  mimeType: string
}

export function googlePhotosConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PHOTOS_API_KEY || process.env.GOOGLE_API_KEY)
}

function apiKey(): string {
  return process.env.GOOGLE_PHOTOS_API_KEY || process.env.GOOGLE_API_KEY || ''
}

/** Extract album id from share URL or raw id. */
export function parseGooglePhotosAlbumId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  if (/^[A-Za-z0-9_-]+$/.test(raw) && raw.length > 8) return raw
  try {
    const url = new URL(raw)
    const parts = url.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex((p) => p === 'album' || p === 'share')
    if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1])
    return parts[parts.length - 1] || null
  } catch {
    return null
  }
}

/**
 * Fetch public-ish album media via Google Photos Library API.
 * Returns empty + warning when credentials are missing (feature optional).
 */
export async function fetchGooglePhotosAlbum(
  albumUrlOrId: string,
): Promise<{ items: GooglePhotoItem[]; warning?: string; error?: string }> {
  if (!googlePhotosConfigured()) {
    return {
      items: [],
      warning:
        'GOOGLE_PHOTOS_API_KEY ausente — configure a variável para importar álbuns do Google Fotos.',
    }
  }
  const albumId = parseGooglePhotosAlbumId(albumUrlOrId)
  if (!albumId) {
    return { items: [], error: 'URL ou ID de álbum inválido' }
  }

  const key = apiKey()
  const endpoint = `https://photoslibrary.googleapis.com/v1/mediaItems:search?key=${encodeURIComponent(key)}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ albumId, pageSize: 50 }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return {
      items: [],
      error: `Google Photos HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
    }
  }

  const data = (await res.json()) as {
    mediaItems?: Array<{
      baseUrl?: string
      description?: string
      mimeType?: string
      filename?: string
    }>
  }
  const items: GooglePhotoItem[] = (data.mediaItems || [])
    .filter((item) => item.baseUrl)
    .map((item) => ({
      url: `${item.baseUrl}=w2048-h2048`,
      caption: item.description || item.filename || '',
      mimeType: item.mimeType || 'image/jpeg',
    }))

  return { items }
}
