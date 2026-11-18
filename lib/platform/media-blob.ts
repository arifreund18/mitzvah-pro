/**
 * Studio images → Vercel Blob instead of data: URLs in Postgres.
 * Supports private stores (default) via /api/platform/media/proxy.
 * Does not touch Bar-Beni.
 */
import { get, put } from '@vercel/blob'
import type { EventConfig } from './types.ts'
import { uid } from './ids.ts'
import { apexHost, protocolFor } from './site-url.ts'

const DATA_URL_RE = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/i

export type BlobAccess = 'public' | 'private'

export function isDataUrl(value: string | undefined | null): boolean {
  return Boolean(value && value.startsWith('data:'))
}

export function blobUploadsConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

/** Private unless BLOB_ACCESS=public (store must match). */
export function blobAccessMode(): BlobAccess {
  return process.env.BLOB_ACCESS === 'public' ? 'public' : 'private'
}

export function isVercelBlobUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname
    return host.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

export function isPrivateBlobUrl(value: string): boolean {
  try {
    return new URL(value).hostname.includes('.private.blob.vercel-storage.com')
  } catch {
    return false
  }
}

export function parseDataUrl(dataUrl: string): { contentType: string; body: Buffer } | null {
  const match = dataUrl.match(DATA_URL_RE)
  if (!match) return null
  const contentType = match[1] || 'application/octet-stream'
  const isBase64 = Boolean(match[2])
  const payload = match[3] || ''
  try {
    const body = isBase64
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf8')
    return { contentType, body }
  } catch {
    return null
  }
}

function extForContentType(contentType: string): string {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('svg')) return 'svg'
  return 'bin'
}

/** Browser/email-safe URL. Private blobs are served through our cached proxy. */
export function toDeliverableMediaUrl(blobUrl: string, hostHint?: string): string {
  if (!isPrivateBlobUrl(blobUrl) && !isVercelBlobUrl(blobUrl)) return blobUrl
  if (blobAccessMode() === 'public' && !isPrivateBlobUrl(blobUrl)) return blobUrl
  if (!isPrivateBlobUrl(blobUrl)) return blobUrl
  const host = hostHint || process.env.NEXT_PUBLIC_SITE_HOST || 'mitzvah.pro'
  const apex = apexHost(host)
  return `${protocolFor(apex)}://${apex}/api/platform/media/proxy?url=${encodeURIComponent(blobUrl)}`
}

export async function uploadBytesToBlob(input: {
  body: Buffer
  contentType: string
  pathname: string
}): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN ausente')
  const access = blobAccessMode()
  const result = await put(input.pathname, input.body, {
    access,
    token,
    contentType: input.contentType,
    addRandomSuffix: true,
  })
  return toDeliverableMediaUrl(result.url)
}

export async function uploadDataUrlToBlob(
  dataUrl: string,
  pathnamePrefix: string,
): Promise<string> {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) throw new Error('data URL inválida')
  const ext = extForContentType(parsed.contentType)
  return uploadBytesToBlob({
    body: parsed.body,
    contentType: parsed.contentType,
    pathname: `${pathnamePrefix}.${ext}`,
  })
}

export async function uploadFileBufferToBlob(input: {
  body: Buffer
  contentType: string
  eventId: string
  kind?: string
}): Promise<string> {
  const kind = (input.kind || 'image').replace(/[^a-z0-9_-]/gi, '') || 'image'
  const ext = extForContentType(input.contentType)
  return uploadBytesToBlob({
    body: input.body,
    contentType: input.contentType,
    pathname: `events/${input.eventId}/${kind}-${uid().slice(0, 8)}.${ext}`,
  })
}

/** @deprecated use uploadBytesToBlob */
export const uploadBytesToPublicBlob = uploadBytesToBlob
/** @deprecated use uploadDataUrlToBlob */
export const uploadDataUrlToPublicBlob = uploadDataUrlToBlob
/** @deprecated use uploadFileBufferToBlob */
export const uploadFileBufferToPublicBlob = uploadFileBufferToBlob

export async function fetchBlobContent(urlOrPathname: string): Promise<{
  body: ReadableStream<Uint8Array>
  contentType: string
  etag?: string
} | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const access = isPrivateBlobUrl(urlOrPathname) || blobAccessMode() === 'private' ? 'private' : 'public'
  const result = await get(urlOrPathname, {
    access,
    token,
  })
  if (!result || result.statusCode !== 200 || !result.stream) return null
  return {
    body: result.stream,
    contentType: result.blob.contentType || 'application/octet-stream',
    etag: result.blob.etag,
  }
}

type WalkStats = { scanned: number; migrated: number; failed: number }

async function walkReplaceDataUrls(
  value: unknown,
  upload: (dataUrl: string, pathHint: string) => Promise<string>,
  pathHint: string,
  stats: WalkStats,
): Promise<unknown> {
  if (typeof value === 'string') {
    stats.scanned += 1
    if (!isDataUrl(value)) return value
    try {
      const url = await upload(value, pathHint)
      stats.migrated += 1
      return url
    } catch {
      stats.failed += 1
      return value
    }
  }
  if (Array.isArray(value)) {
    const next: unknown[] = []
    for (let i = 0; i < value.length; i += 1) {
      next.push(await walkReplaceDataUrls(value[i], upload, `${pathHint}.${i}`, stats))
    }
    return next
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(obj)) {
      next[key] = await walkReplaceDataUrls(child, upload, `${pathHint}.${key}`, stats)
    }
    return next
  }
  return value
}

/** Replace every data: URL inside an event config with Blob URLs. Idempotent for http(s). */
export async function externalizeConfigDataUrls(
  config: EventConfig,
  eventId: string,
): Promise<{ config: EventConfig; stats: WalkStats }> {
  const stats: WalkStats = { scanned: 0, migrated: 0, failed: 0 }
  if (!blobUploadsConfigured()) {
    return { config, stats }
  }
  const next = (await walkReplaceDataUrls(
    config,
    (dataUrl, pathHint) => {
      const safeHint = pathHint.replace(/[^a-z0-9._-]+/gi, '-').slice(0, 80)
      return uploadDataUrlToBlob(dataUrl, `events/${eventId}/${safeHint}`)
    },
    'config',
    stats,
  )) as EventConfig
  return { config: next, stats }
}

export function configHasDataUrl(config: EventConfig): boolean {
  const json = JSON.stringify(config)
  return json.includes('data:image') || json.includes('data:application') || json.includes('data:video')
}
