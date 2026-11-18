/**
 * Resolve Vercel Blob credentials across naming schemes.
 * New stores created via dashboard may inject BLOB1_* instead of BLOB_*.
 */

export function blobReadWriteToken(): string | undefined {
  // Prefer BLOB1_* (new dashboard stores) over legacy BLOB_* so a leftover
  // private-store token does not shadow the public store.
  return (
    process.env.BLOB1_READ_WRITE_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    undefined
  )
}

export function blobStoreId(): string | undefined {
  return process.env.BLOB1_STORE_ID || process.env.BLOB_STORE_ID || undefined
}

export function blobWebhookPublicKey(): string | undefined {
  return (
    process.env.BLOB1_WEBHOOK_PUBLIC_KEY ||
    process.env.BLOB_WEBHOOK_PUBLIC_KEY ||
    undefined
  )
}

export type BlobAccess = 'public' | 'private'

/**
 * Access must match the store. Prefer explicit BLOB_ACCESS;
 * if BLOB1_* is present (new public store) default to public;
 * otherwise default private for legacy stores.
 */
export function blobAccessMode(): BlobAccess {
  const raw = process.env.BLOB_ACCESS
  if (raw === 'public' || raw === 'private') return raw
  if (process.env.BLOB1_READ_WRITE_TOKEN) return 'public'
  return 'private'
}

export function blobUploadsConfigured(): boolean {
  return Boolean(blobReadWriteToken())
}
