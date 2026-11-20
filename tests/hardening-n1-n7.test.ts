import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  dashboardPassword,
  dashboardSecretsConfigured,
  sessionSecret,
} from '../lib/platform/auth.ts'
import { emailSendClaimId } from '../lib/platform/email-claim.ts'
import { isEventBlobPath } from '../lib/platform/media-blob.ts'

describe('N7 dashboard secrets', () => {
  it('throws when secrets are required and unset', () => {
    const prevRequire = process.env.MITZVAH_REQUIRE_SECRETS
    const prevPass = process.env.DASHBOARD_PASSWORD
    const prevSecret = process.env.DASHBOARD_SECRET
    const prevDb = process.env.DATABASE_URL
    const prevAllow = process.env.MITZVAH_ALLOW_DEFAULT_SECRETS
    try {
      process.env.MITZVAH_REQUIRE_SECRETS = '1'
      delete process.env.DASHBOARD_PASSWORD
      delete process.env.DASHBOARD_SECRET
      delete process.env.DATABASE_URL
      delete process.env.MITZVAH_ALLOW_DEFAULT_SECRETS
      assert.equal(dashboardSecretsConfigured(), false)
      assert.throws(() => dashboardPassword(), /DASHBOARD_PASSWORD/)
      assert.throws(() => sessionSecret(), /DASHBOARD_SECRET/)
    } finally {
      if (prevRequire === undefined) delete process.env.MITZVAH_REQUIRE_SECRETS
      else process.env.MITZVAH_REQUIRE_SECRETS = prevRequire
      if (prevPass === undefined) delete process.env.DASHBOARD_PASSWORD
      else process.env.DASHBOARD_PASSWORD = prevPass
      if (prevSecret === undefined) delete process.env.DASHBOARD_SECRET
      else process.env.DASHBOARD_SECRET = prevSecret
      if (prevDb === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = prevDb
      if (prevAllow === undefined) delete process.env.MITZVAH_ALLOW_DEFAULT_SECRETS
      else process.env.MITZVAH_ALLOW_DEFAULT_SECRETS = prevAllow
    }
  })

  it('does not expose commit-SHA-derived admin passwords', () => {
    const prevRequire = process.env.MITZVAH_REQUIRE_SECRETS
    const prevPass = process.env.DASHBOARD_PASSWORD
    const prevSha = process.env.VERCEL_GIT_COMMIT_SHA
    try {
      process.env.MITZVAH_REQUIRE_SECRETS = '1'
      delete process.env.DASHBOARD_PASSWORD
      process.env.VERCEL_GIT_COMMIT_SHA = 'abc123deadbeef'
      assert.throws(() => dashboardPassword())
      try {
        const value = dashboardPassword()
        assert.ok(!String(value).includes('abc123'), 'must not embed commit sha')
      } catch {
        // expected
      }
    } finally {
      if (prevRequire === undefined) delete process.env.MITZVAH_REQUIRE_SECRETS
      else process.env.MITZVAH_REQUIRE_SECRETS = prevRequire
      if (prevPass === undefined) delete process.env.DASHBOARD_PASSWORD
      else process.env.DASHBOARD_PASSWORD = prevPass
      if (prevSha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA
      else process.env.VERCEL_GIT_COMMIT_SHA = prevSha
    }
  })
})

describe('N4 email send claim id', () => {
  it('builds a stable deterministic id (imports real helper)', () => {
    const a = emailSendClaimId({
      eventId: 'evt-1',
      familyId: 'fam-1',
      type: 'reminder-d7',
      toEmail: ' Guest@Example.COM ',
    })
    const b = emailSendClaimId({
      eventId: 'evt-1',
      familyId: 'fam-1',
      type: 'reminder-d7',
      toEmail: 'guest@example.com',
    })
    assert.equal(a, b)
    assert.equal(a, 'claim:evt-1:fam-1:reminder-d7:guest@example.com')
  })
})

describe('E9 media path lock (real import)', () => {
  it('requires events/{id}/ when eventId is provided', () => {
    const url = 'https://x.blob.vercel-storage.com/events/abc/file.png'
    assert.equal(isEventBlobPath(url, 'abc'), true)
    assert.equal(isEventBlobPath(url, 'other'), false)
  })
})
