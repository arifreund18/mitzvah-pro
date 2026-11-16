import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  fetchGoogleSheetsCsv,
  googleSheetsCsvCandidateUrls,
  googleSheetsCsvExportUrl,
  parseGoogleSheetsUrl,
} from '../lib/platform/google-sheets-guests.ts'

describe('parseGoogleSheetsUrl', () => {
  it('reads id and hash gid from edit URLs', () => {
    assert.deepEqual(
      parseGoogleSheetsUrl('https://docs.google.com/spreadsheets/d/abc123XYZ/edit#gid=42'),
      { kind: 'id', id: 'abc123XYZ', gid: '42' },
    )
  })
})

describe('googleSheetsCsvCandidateUrls', () => {
  it('prefers gviz CSV for link-shared edit URLs', () => {
    const urls = googleSheetsCsvCandidateUrls(
      'https://docs.google.com/spreadsheets/d/abc123XYZ/edit#gid=42',
    )
    assert.equal(
      urls[0],
      'https://docs.google.com/spreadsheets/d/abc123XYZ/gviz/tq?tqx=out%3Acsv&gid=42',
    )
    assert.ok(urls.some((u) => u.includes('/export?format=csv')))
  })

  it('converts published URLs to CSV pub output', () => {
    const urls = googleSheetsCsvCandidateUrls(
      'https://docs.google.com/spreadsheets/d/e/2PACX-abc/pubhtml?gid=0',
    )
    assert.equal(urls.length, 1)
    assert.ok(urls[0].includes('/pub'))
    assert.ok(urls[0].includes('output=csv'))
  })

  it('rejects non-sheets URLs', () => {
    assert.equal(googleSheetsCsvExportUrl('https://example.com/sheet'), null)
  })
})

describe('fetchGoogleSheetsCsv', () => {
  it('tries the next candidate when the first returns 400', async () => {
    const calls: string[] = []
    const result = await fetchGoogleSheetsCsv(
      'https://docs.google.com/spreadsheets/d/abc123/edit#gid=0',
      async (url) => {
        calls.push(String(url))
        if (calls.length === 1) {
          return new Response('bad', { status: 400 })
        }
        return new Response('family_name,email\nAda,ada@example.com\n', { status: 200 })
      },
    )
    assert.ok(!('error' in result))
    if (!('error' in result)) {
      assert.ok(result.csv.includes('Ada'))
    }
    assert.ok(calls.length >= 2)
  })
})
