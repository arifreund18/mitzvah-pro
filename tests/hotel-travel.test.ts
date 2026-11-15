import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { CardDesign, Hotel } from '../lib/platform/types.ts'

/** Mirrors normalize.ts hotel.travelMode coercion (legacy events default to walk). */
function coerceTravelMode(value: unknown): Hotel['travelMode'] {
  return value === 'drive' ? 'drive' : 'walk'
}

describe('hotel travelMode', () => {
  it('defaults missing or invalid travelMode to walk', () => {
    assert.equal(coerceTravelMode(undefined), 'walk')
    assert.equal(coerceTravelMode('walk'), 'walk')
    assert.equal(coerceTravelMode('bike'), 'walk')
  })

  it('accepts drive', () => {
    assert.equal(coerceTravelMode('drive'), 'drive')
  })
})

describe('card photo position fields', () => {
  it('are optional strings on CardDesign', () => {
    const design = {
      panelPhotoPosition: '50% 20%',
      cardImagePosition: 'center',
    } as Pick<CardDesign, 'panelPhotoPosition' | 'cardImagePosition'>
    assert.equal(typeof design.panelPhotoPosition, 'string')
    assert.equal(typeof design.cardImagePosition, 'string')
  })
})
