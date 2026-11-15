import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { pageBackgroundCss, pageBackgroundStyle } from '../lib/platform/card-background.ts'
import type { CardDesign } from '../lib/platform/types.ts'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function design(partial: Partial<CardDesign> = {}): CardDesign {
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
    cardImagePosition: 'center',
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
    panelPhotoPosition: 'center',
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
    suggestedPalette: '',
    ...partial,
  }
}

describe('pageBackgroundStyle', () => {
  it('uses pageColor alone when texture is empty', () => {
    assert.deepEqual(pageBackgroundStyle(design({ pageColor: '#112233' })), {
      backgroundColor: '#112233',
    })
  })

  it('applies pageTexture as cover background image', () => {
    const style = pageBackgroundStyle(
      design({ pageColor: '#010101', pageTexture: 'https://cdn.example/texture.png' }),
    )
    assert.equal(style.backgroundColor, '#010101')
    assert.equal(style.backgroundImage, 'url(https://cdn.example/texture.png)')
    assert.equal(style.backgroundSize, 'cover')
    assert.equal(style.backgroundPosition, 'center')
  })
})

describe('pageBackgroundCss', () => {
  it('embeds texture url for HTML email', () => {
    const css = pageBackgroundCss(
      design({ pageColor: '#0a0a0a', pageTexture: 'https://cdn.example/page-texture.png' }),
      escapeHtml,
    )
    assert.match(css, /background-image:url\('https:\/\/cdn\.example\/page-texture\.png'\)/)
    assert.match(css, /background-color:#0a0a0a/)
  })

  it('falls back to solid pageColor', () => {
    assert.equal(pageBackgroundCss(design({ pageColor: '#abcdef' }), escapeHtml), 'background:#abcdef;')
  })
})
