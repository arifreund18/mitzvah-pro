import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseGooglePhotosAlbumId } from '../lib/platform/google-photos.ts'

describe('parseGooglePhotosAlbumId', () => {
  it('accepts raw ids', () => {
    assert.equal(parseGooglePhotosAlbumId('AF1QipExampleAlbumId99'), 'AF1QipExampleAlbumId99')
  })

  it('parses share URLs', () => {
    const id = parseGooglePhotosAlbumId(
      'https://photos.google.com/share/AF1QipShareTokenHere/photo/x',
    )
    assert.ok(id)
    assert.match(id!, /AF1Qip/)
  })

  it('rejects empty', () => {
    assert.equal(parseGooglePhotosAlbumId(''), null)
  })
})
