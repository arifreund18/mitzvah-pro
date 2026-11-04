import { NextResponse } from 'next/server'
import { uid } from '@/lib/platform/ids'
import { fetchGooglePhotosAlbum, googlePhotosConfigured } from '@/lib/platform/google-photos'
import { getEvent, updateEvent } from '@/lib/platform/store'
import { requireEventAccess } from '@/lib/platform/session'
import type { GalleryItem } from '@/lib/platform/types'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied

  const event = await getEvent(id)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as {
    albumUrl?: string
    apply?: boolean
  } | null
  const albumUrl = body?.albumUrl?.trim() || ''
  if (!albumUrl) {
    return NextResponse.json({ error: 'Informe albumUrl' }, { status: 400 })
  }

  if (!googlePhotosConfigured()) {
    return NextResponse.json(
      {
        error: 'Google Photos não configurado',
        warning:
          'Defina GOOGLE_PHOTOS_API_KEY (OAuth/API key) no ambiente. Importação opcional — Bar-Beni intocado.',
        configured: false,
        items: [],
      },
      { status: 501 },
    )
  }

  const result = await fetchGooglePhotosAlbum(albumUrl)
  if (result.error) {
    return NextResponse.json({ error: result.error, items: [] }, { status: 502 })
  }

  const imported: GalleryItem[] = result.items.map((item, i) => ({
    id: uid(),
    url: item.url,
    type: item.mimeType.startsWith('video/') ? 'video' : 'image',
    caption: item.caption,
    approved: true,
    showOnSite: true,
    sortOrder: (event.config.media.galleryItems?.length || 0) + i,
  }))

  if (!body?.apply) {
    return NextResponse.json({
      preview: imported,
      count: imported.length,
      configured: true,
      warning: result.warning,
    })
  }

  const galleryItems = [...(event.config.media.galleryItems || []), ...imported]
  const gallery = galleryItems
    .filter((g) => g.type === 'image' && g.showOnSite)
    .map((g) => g.url)
  const updated = await updateEvent(id, {
    config: {
      ...event.config,
      media: { ...event.config.media, galleryItems, gallery },
    },
  })

  return NextResponse.json({
    added: imported.length,
    galleryItems: updated?.config.media.galleryItems || galleryItems,
    configured: true,
  })
}

export async function GET() {
  return NextResponse.json({ configured: googlePhotosConfigured() })
}
