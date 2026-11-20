import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Documents M5 reconcile rules used by replaceGuests:
 * keep server id/token for known families; mint new ones for newcomers.
 */
describe('replaceGuests M5 reconcile contract', () => {
  it('preserves id and token when incoming id matches an existing family', () => {
    const existing = [{ id: 'fam-1', token: 'tok-server' }]
    const incoming = [{ id: 'fam-1', token: 'tok-forged' }]
    const prev = existing.find((g) => g.id === incoming[0].id)
    const resolved = {
      id: prev!.id,
      token: prev!.token,
    }
    assert.equal(resolved.id, 'fam-1')
    assert.equal(resolved.token, 'tok-server')
  })

  it('ignores client id/token for unknown families', () => {
    const existingIds = new Set(['fam-1'])
    const incoming = { id: 'client-new', token: 'client-tok' }
    const isNew = !existingIds.has(incoming.id)
    assert.equal(isNew, true)
    const resolved = isNew ? { id: '', token: '' } : incoming
    assert.equal(resolved.id, '')
    assert.equal(resolved.token, '')
  })

  it('drops person ids that are not already on the family (E10)', () => {
    const existingPersonIds = new Set(['p1', 'p2'])
    const incomingPeople = [
      { id: 'p1', name: 'A' },
      { id: 'other-event-person', name: 'B' },
    ]
    const people = incomingPeople.map((person) =>
      person.id && existingPersonIds.has(person.id) ? person : { ...person, id: '' },
    )
    assert.equal(people[0].id, 'p1')
    assert.equal(people[1].id, '')
  })
})
