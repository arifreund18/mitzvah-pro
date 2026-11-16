import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { designAssetPublicUrl } from '../lib/platform/card-background.ts'

describe('designAssetPublicUrl', () => {
  it('builds an apex HTTPS asset URL for email clients', () => {
    assert.equal(
      designAssetPublicUrl('adissi', 'pageTexture', { host: 'mitzvah.pro', surface: 'invite' }),
      'https://mitzvah.pro/api/platform/e/adissi/design-asset?surface=invite&kind=pageTexture',
    )
  })

  it('keeps localhost http for local preview hosts', () => {
    assert.equal(
      designAssetPublicUrl('adissi', 'sealUrl', { host: 'localhost:3000', surface: 'std' }),
      'http://localhost:3000/api/platform/e/adissi/design-asset?surface=std&kind=sealUrl',
    )
  })
})
