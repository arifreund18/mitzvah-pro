import { NextResponse } from 'next/server'
import {
  blobUploadsConfigured,
  uploadFileBufferToBlob,
} from '@/lib/platform/media-blob'
import { requireEventAccess } from '@/lib/platform/session'

type Ctx = { params: Promise<{ id: string }> }

const MAX_IMAGE_BYTES = 1_500_000

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const denied = await requireEventAccess(id)
  if (denied) return denied

  if (!blobUploadsConfigured()) {
    return NextResponse.json(
      {
        error:
          'BLOB_READ_WRITE_TOKEN não configurado. Defina o token do Vercel Blob para uploads do studio.',
      },
      { status: 503 },
    )
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Imagem maior que 1.5 MB' }, { status: 400 })
  }
  const kindRaw = form?.get('kind')
  const kind = typeof kindRaw === 'string' ? kindRaw : 'image'
  const contentType = file.type || 'application/octet-stream'
  if (!contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
    return NextResponse.json({ error: 'Apenas imagens são aceitas' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    const url = await uploadFileBufferToBlob({
      body: buffer,
      contentType,
      eventId: id,
      kind,
    })
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha no upload'
    const hint = message.includes('private store')
      ? ' Store Blob está private — o app agora usa access private + proxy. Redeploy se ainda vir este erro.'
      : ''
    return NextResponse.json({ error: `${message}${hint}` }, { status: 502 })
  }
}
