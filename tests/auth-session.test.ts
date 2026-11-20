import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'

describe('session HMAC (C1)', () => {
  const prevSecret = process.env.DASHBOARD_SECRET
  const prevPassword = process.env.DASHBOARD_PASSWORD
  const prevVercel = process.env.VERCEL_ENV

  before(() => {
    process.env.DASHBOARD_SECRET = 'test-secret-for-hmac-audit'
    process.env.DASHBOARD_PASSWORD = 'test-admin-password'
    process.env.VERCEL_ENV = 'production'
  })

  after(() => {
    if (prevSecret === undefined) delete process.env.DASHBOARD_SECRET
    else process.env.DASHBOARD_SECRET = prevSecret
    if (prevPassword === undefined) delete process.env.DASHBOARD_PASSWORD
    else process.env.DASHBOARD_PASSWORD = prevPassword
    if (prevVercel === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = prevVercel
  })

  it('signs user sessions with HMAC-SHA256 and rejects forged role elevation', async () => {
    const { encodeUserSession, readSession } = await import('../lib/platform/auth.ts')
    const token = encodeUserSession('user-1', 'org-1', 'org_member')
    assert.ok(token.startsWith('u.user-1.org-1.org_member.'))
    const actor = readSession(token)
    assert.deepEqual(actor, {
      kind: 'user',
      userId: 'user-1',
      orgId: 'org-1',
      role: 'org_member',
    })

    // Classic fnv1a forge: flip role in payload and keep a short hex sig — must fail.
    const parts = token.split('.')
    const forgedPayload = `u.user-1.org-1.platform_admin.${parts[4]}`
    const forged = `${forgedPayload}.deadbeef`
    assert.equal(readSession(forged), null)

    // Even a correctly re-HMAC'd payload needs the real secret — attacker with only
    // a member cookie cannot derive HMAC-SHA256 of another payload.
    const attackerGuess = createHmac('sha256', 'wrong-secret').update(forgedPayload).digest('base64url')
    assert.equal(readSession(`${forgedPayload}.${attackerGuess}`), null)
  })

  it('rejects expired and legacy fnv1a admin tokens', async () => {
    const { readSession, sessionToken } = await import('../lib/platform/auth.ts')
    const token = sessionToken()
    assert.ok(token.startsWith('a.'))
    assert.ok(readSession(token))

    const expiredPayload = 'a.1'
    const expiredSig = createHmac('sha256', 'test-secret-for-hmac-audit')
      .update(expiredPayload)
      .digest('base64url')
    assert.equal(readSession(`${expiredPayload}.${expiredSig}`), null)

    // Old 8-hex fnv1a style
    assert.equal(readSession('a1b2c3d4'), null)
  })
})
