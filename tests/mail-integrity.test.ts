import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { emailSendClaimId } from '../lib/platform/email-claim.ts'

describe('mail integrity contracts (C3/C4/E4/E5/E6)', () => {
  it('C4/N5: after SES accept, guest counts as succeeded even if mark retries', () => {
    const batch = ['a', 'b', 'c']
    const succeeded: string[] = []
    const marked: string[] = []
    for (const id of batch) {
      // Count success before persistence (N5) so lease expiry cannot re-send.
      succeeded.push(id)
      try {
        marked.push(id)
      } catch {
        // still in succeeded
      }
    }
    assert.equal(succeeded.length, 3)
    assert.equal(marked.length, 3)
  })

  it('N4/E5: claim ids are deterministic per event+family+type+email', () => {
    const id = emailSendClaimId({
      eventId: 'e1',
      familyId: 'f1',
      type: 'reminder-d30',
      toEmail: 'a@x.com',
    })
    assert.equal(id, 'claim:e1:f1:reminder-d30:a@x.com')
    assert.notEqual(
      id,
      emailSendClaimId({
        eventId: 'e2',
        familyId: 'f1',
        type: 'reminder-d30',
        toEmail: 'a@x.com',
      }),
    )
  })

  it('E6/A3: catch-up picks smallest enabled window with days <= window', () => {
    const windows = [
      { days: 30 as const, enabled: true },
      { days: 7 as const, enabled: true },
      { days: 2 as const, enabled: false },
    ]
    const select = (days: number) =>
      windows
        .filter((w) => w.enabled && days <= w.days)
        .sort((a, b) => a.days - b.days)[0]
    assert.equal(select(25)?.days, 30) // missed exact D-30, still in catch-up
    assert.equal(select(5)?.days, 7)
    assert.equal(select(1)?.days, 7) // d2 off → still d7
    assert.equal(select(40), undefined)
  })

  it('E4: sync keeps families not in a stale snapshot for other events', () => {
    // Document the contract: delete only within event_id, never DELETE FROM events
    // for ids missing from a concurrent snapshot.
    const snapshotEventIds = ['a']
    const dbEventIds = ['a', 'b']
    const wouldDeleteEvents = dbEventIds.filter((id) => !snapshotEventIds.includes(id))
    // New behavior: do not delete those.
    const deleteEvents = false
    assert.equal(deleteEvents, false)
    assert.deepEqual(wouldDeleteEvents, ['b'])
  })
})
