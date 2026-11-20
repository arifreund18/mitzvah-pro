import { NextResponse } from 'next/server'
import { fetchBlobContent, isEventBlobPath, isVercelBlobUrl } from '@/lib/platform/media-blob'

/**
 * Serves private Vercel Blob objects with long-lived cache so email/site <img>
 * tags work without a public store. Only allows *.blob.vercel-storage.com URLs
 * under events/… (E9).
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url')?.trim() || ''
  if (!url || !isVercelBlobUrl(url) || !isEventBlobPath(url)) {
    return NextResponse.json({ error: 'URL de blob inválida' }, { status: 400 })
  }

  const ifNoneMatch = request.headers.get('if-none-match') || undefined
  try {
    const content = await fetchBlobContent(url)
    if (!content) {
      return NextResponse.json({ error: 'Blob não encontrado' }, { status: 404 })
    }
    if (ifNoneMatch && content.etag && ifNoneMatch === content.etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: content.etag,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      })
    }
    return new NextResponse(content.body, {
      status: 200,
      headers: {
        'Content-Type': content.contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        ...(content.etag ? { ETag: content.etag } : {}),
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao ler blob' },
      { status: 502 },
    )
  }
}
