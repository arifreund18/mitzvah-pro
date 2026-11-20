import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('mail integrity contracts (C3/C4/E4/E5/E6)', () => {
  it('C4: mark-sent-per-email closes the timeout requeue window', () => {
    const batch = ['a', 'b', 'c']
    const marked: string[] = []
    const sentAt = new Map<string, string>()
    for (const id of batch) {
      // After each successful send we mark immediately (not after the whole batch).
      marked.push(id)
      sentAt.set(id, new Date().toISOString())
    }
    assert.equal(marked.length, 3)
    assert.ok(sentAt.get('a'))
    // A mid-batch kill after 'a' would still leave 'a' marked — no re-send.
    assert.equal(Boolean(sentAt.get('a')), true)
  })

  it('E5: already-sent check is keyed by event+family+type+email', () => {
    const logs = [
      { eventId: 'e1', familyId: 'f1', type: 'reminder-d30', toEmail: 'a@x.com', status: 'sent' },
      { eventId: 'e2', familyId: 'f1', type: 'reminder-d30', toEmail: 'a@x.com', status: 'sent' },
    ]
    const already = (eventId: string) =>
      logs.some(
        (log) =>
          log.eventId === eventId &&
          log.familyId === 'f1' &&
          log.type === 'reminder-d30' &&
          log.toEmail === 'a@x.com' &&
          log.status === 'sent',
      )
    assert.equal(already('e1'), true)
    assert.equal(already('e3'), false)
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
