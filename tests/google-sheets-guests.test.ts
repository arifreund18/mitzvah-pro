import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { googleSheetsCsvExportUrl } from '../lib/platform/google-sheets-guests.ts'

describe('googleSheetsCsvExportUrl', () => {
  it('converts edit URLs to CSV export', () => {
    const url = googleSheetsCsvExportUrl(
      'https://docs.google.com/spreadsheets/d/abc123XYZ/edit#gid=42',
    )
    assert.equal(
      url,
      'https://docs.google.com/spreadsheets/d/abc123XYZ/export?format=csv&gid=42',
    )
  })

  it('converts published URLs to CSV pub output', () => {
    const url = googleSheetsCsvExportUrl(
      'https://docs.google.com/spreadsheets/d/e/2PACX-abc/pubhtml?gid=0',
    )
    assert.ok(url)
    assert.ok(url!.includes('/pub'))
    assert.ok(url!.includes('output=csv'))
  })

  it('rejects non-sheets URLs', () => {
    assert.equal(googleSheetsCsvExportUrl('https://example.com/sheet'), null)
  })
})
