import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { familyToken } from '../lib/platform/tokens.ts'

describe('familyToken', () => {
  it('returns a 12-char URL-safe token', () => {
    const token = familyToken()
    assert.equal(token.length, 12)
    assert.match(token, /^[abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/)
  })

  it('produces unique values across many draws', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const token = familyToken()
      assert.equal(seen.has(token), false)
      seen.add(token)
    }
  })
})
