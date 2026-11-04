import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { CardDesign } from '../lib/platform/types.ts'

/** Mirrors defaultCardDesign keys without loading defaults.ts (ESM strip-types). */
function sampleDesign(): CardDesign {
  return {
    pageColor: '#1a2033',
    pageTexture: '',
    envelopeColor: '#c4a574',
    envelopeTexture: '',
    envelopeLiner: '#f7f1e4',
    envelopeExterior: '',
    envelopeNameColor: '#1c1630',
    sealUrl: '',
    sealBg: '#22d3ee',
    sealLabel: '',
    openLabel: '',
    forLabel: '',
    fontKey: 'georgia',
    cardColor: '#f7f1e4',
    cardTextColor: '#1c1630',
    cardImageUrl: '',
    greetingColor: '#6a5b4c',
    nameColor: '#1c1630',
    bodyColor: '#3b2418',
    introColor: '#6a5b4c',
    headingColor: '#1c1630',
    bodySizePx: 16,
    bodyBold: false,
    introSizePx: 14,
    introBold: false,
    headingSizePx: 28,
    headingBold: true,
    panelPhotoUrl: '',
    panelPhotoShape: 'circle',
    mapUrl: '',
    address1: '',
    address2: '',
    timeLabel: '',
    placeLabel: '',
    cityLabel: '',
    dateLabel: '',
    title: '',
    eventName: '',
    heading: '',
    hosts: '',
    message: '',
    tip: '',
    greeting: '',
    intro: '',
    subject: '',
    ctaView: '',
    ctaCalendar: '',
    ctaMap: '',
    ctaRsvp: '',
    rsvpLabel: '',
    rsvpHint: '',
    suggestedPalette: '#1a2033,#c4a574,#f7f1e4,#22d3ee,#1c1630',
  }
}

describe('CardDesign shape', () => {
  it('exposes the expanded envelope/card parameter set', () => {
    const design = sampleDesign()
    const keys = Object.keys(design)
    assert.ok(keys.length >= 45, `expected >=45 keys, got ${keys.length}`)
    assert.equal(typeof design.pageTexture, 'string')
    assert.equal(typeof design.envelopeTexture, 'string')
    assert.equal(typeof design.envelopeExterior, 'string')
    assert.equal(typeof design.suggestedPalette, 'string')
    assert.equal(typeof design.headingSizePx, 'number')
    assert.equal(typeof design.rsvpHint, 'string')
  })
})
