import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { emailSendClaimId } from '../lib/platform/email-claim.ts'

describe('emailSendClaimId', () => {
  it('normalizes email case and whitespace', () => {
    assert.equal(
      emailSendClaimId({
        eventId: 'e',
        familyId: 'f',
        type: 'invite',
        toEmail: ' A@B.COM ',
      }),
      'claim:e:f:invite:a@b.com',
    )
  })
})
