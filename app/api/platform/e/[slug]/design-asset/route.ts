import { NextResponse } from 'next/server'
import {
  fetchBlobContent,
  isEventBlobPath,
  isPrivateBlobUrl,
  isVercelBlobUrl,
} from '@/lib/platform/media-blob'
import { getEventBySlug } from '@/lib/platform/store'
import type { CardDesign } from '@/lib/platform/types'

type Ctx = { params: Promise<{ slug: string }> }

const KINDS = [
  'pageTexture',
  'envelopeTexture',
  'sealUrl',
  'cardImageUrl',
  'panelPhotoUrl',
] as const

type AssetKind = (typeof KINDS)[number]

function isAssetKind(value: string | null): value is AssetKind {
  return Boolean(value && (KINDS as readonly string[]).includes(value))
}

function resolveAssetUrl(design: CardDesign, kind: AssetKind, sealFallback: string): string {
  if (kind === 'sealUrl') return (design.sealUrl || sealFallback || '').trim()
  return String(design[kind] || '').trim()
}

function parseDataUrl(dataUrl: string): { contentType: string; body: Buffer } | null {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/i)
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

/** Public image proxy for invitation design assets (so email clients can fetch studio uploads). */
export async function GET(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params
  const url = new URL(request.url)
  const kindParam = url.searchParams.get('kind')
  const surface = url.searchParams.get('surface') === 'std' ? 'std' : 'invite'
  if (!isAssetKind(kindParam)) {
    return NextResponse.json({ error: 'kind inválido' }, { status: 400 })
  }

  const event = await getEventBySlug(slug)
  if (!event || event.status === 'archived') {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  const design =
    surface === 'std' ? event.config.saveTheDate.design : event.config.invitation.design
  const asset = resolveAssetUrl(design, kindParam, event.config.invitation.sealImageUrl)
  if (!asset) {
    return NextResponse.json({ error: 'Asset ausente' }, { status: 404 })
  }

  if (/^https?:\/\//i.test(asset)) {
    let blobTarget = ''
    try {
      const parsed = new URL(asset)
      if (parsed.pathname.includes('/api/platform/media/proxy')) {
        blobTarget = parsed.searchParams.get('url') || ''
      } else if (isPrivateBlobUrl(asset) || isVercelBlobUrl(asset)) {
        blobTarget = asset
      }
    } catch {
      blobTarget = ''
    }
    // E9: only serve this event's blobs — no open redirect to arbitrary HTTPS.
    if (
      blobTarget &&
      isVercelBlobUrl(blobTarget) &&
      isEventBlobPath(blobTarget, event.id)
    ) {
      const content = await fetchBlobContent(blobTarget)
      if (!content) {
        return NextResponse.json({ error: 'Blob ausente' }, { status: 404 })
      }
      return new NextResponse(content.body, {
        status: 200,
        headers: {
          'Content-Type': content.contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      })
    }
    return NextResponse.json({ error: 'Asset fora do escopo do evento' }, { status: 400 })
  }

  if (asset.startsWith('data:')) {
    const parsed = parseDataUrl(asset)
    if (!parsed) {
      return NextResponse.json({ error: 'data URL inválida' }, { status: 400 })
    }
    return new NextResponse(new Uint8Array(parsed.body), {
      status: 200,
      headers: {
        'Content-Type': parsed.contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  return NextResponse.json({ error: 'URL de asset não suportada' }, { status: 400 })
}
