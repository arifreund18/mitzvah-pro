import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  configHasDataUrl,
  isDataUrl,
  isEventBlobPath,
  isPrivateBlobUrl,
  isVercelBlobUrl,
  parseDataUrl,
  toDeliverableMediaUrl,
} from '../lib/platform/media-blob.ts'
import type { EventConfig } from '../lib/platform/types.ts'

describe('media-blob helpers', () => {
  it('detects data URLs', () => {
    assert.equal(isDataUrl('data:image/png;base64,aaa'), true)
    assert.equal(isDataUrl('https://cdn.example/a.png'), false)
  })

  it('parses base64 data URLs', () => {
    const tiny =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const parsed = parseDataUrl(tiny)
    assert.ok(parsed)
    assert.equal(parsed!.contentType, 'image/png')
    assert.ok(parsed!.body.length > 0)
  })

  it('detects data:image inside event config', () => {
    const config = {
      media: { heroUrl: 'https://cdn.example/a.png', gallery: [], galleryItems: [], ambientAudioUrl: '' },
    } as unknown as EventConfig
    assert.equal(configHasDataUrl(config), false)
    config.media.heroUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    assert.equal(configHasDataUrl(config), true)
  })

  it('rewrites private blob URLs through the media proxy', () => {
    const privateUrl =
      'https://abc123.private.blob.vercel-storage.com/events/e1/seal-xyz.png'
    assert.equal(isVercelBlobUrl(privateUrl), true)
    assert.equal(isPrivateBlobUrl(privateUrl), true)
    const prev = process.env.BLOB_ACCESS
    delete process.env.BLOB_ACCESS
    const delivered = toDeliverableMediaUrl(privateUrl, 'mitzvah.pro')
    assert.match(delivered, /^https:\/\/mitzvah\.pro\/api\/platform\/media\/proxy\?url=/)
    assert.ok(delivered.includes(encodeURIComponent(privateUrl)))
    if (prev === undefined) delete process.env.BLOB_ACCESS
    else process.env.BLOB_ACCESS = prev
  })

  it('only allows events/ blob paths (E9)', () => {
    const ok = 'https://abc123.private.blob.vercel-storage.com/events/e1/seal.png'
    const other = 'https://abc123.private.blob.vercel-storage.com/secrets/key.txt'
    assert.equal(isEventBlobPath(ok), true)
    assert.equal(isEventBlobPath(ok, 'e1'), true)
    assert.equal(isEventBlobPath(ok, 'e2'), false)
    assert.equal(isEventBlobPath(other), false)
  })
})
