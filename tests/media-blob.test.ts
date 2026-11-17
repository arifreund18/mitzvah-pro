import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  configHasDataUrl,
  isDataUrl,
  parseDataUrl,
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
})
