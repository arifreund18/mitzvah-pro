/** Browser helper: upload studio images to Blob via authenticated API (no data: in Postgres). */

const MAX_IMAGE_BYTES = 1_500_000

export async function uploadStudioImageFile(input: {
  eventId: string
  file: File
  kind?: string
  tooBigMessage?: string
}): Promise<string> {
  if (input.file.size > MAX_IMAGE_BYTES) {
    throw new Error(input.tooBigMessage || 'Imagem maior que 1.5 MB')
  }
  const body = new FormData()
  body.set('file', input.file)
  if (input.kind) body.set('kind', input.kind)
  const res = await fetch(`/api/platform/events/${encodeURIComponent(input.eventId)}/media/upload`, {
    method: 'POST',
    body,
  })
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || 'Falha no upload')
  }
  return data.url
}
