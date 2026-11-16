import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeGuest, normalizePerson } from '../lib/platform/normalize-guest.ts'

function mergePeople(
  existing: ReturnType<typeof normalizePerson>[],
  incoming: ReturnType<typeof normalizePerson>[],
) {
  const people = [...existing]
  for (const person of incoming) {
    const name = person.name.trim().toLowerCase()
    if (!name) {
      people.push(person)
      continue
    }
    const dup = people.find((item) => item.name.trim().toLowerCase() === name)
    if (dup) {
      dup.type = person.type === 'child' ? 'child' : dup.type
      continue
    }
    people.push(person)
  }
  return people
}

describe('guest family merge by email', () => {
  it('merges a second person into the same family people list', () => {
    const family = normalizeGuest({
      familyName: 'TEste2',
      email: 'arifreund+teste2@gmail.com',
      people: [normalizePerson({ name: 'Ari', type: 'adult', status: 'pending' })],
    })
    const nextPeople = mergePeople(family.people, [
      normalizePerson({ name: 'Ari2', type: 'child', status: 'pending' }),
    ])
    const merged = normalizeGuest({ ...family, people: nextPeople })
    assert.equal(merged.people.length, 2)
    assert.equal(merged.partySize, 2)
    assert.ok(merged.people.some((p) => p.name === 'Ari' && p.type === 'adult'))
    assert.ok(merged.people.some((p) => p.name === 'Ari2' && p.type === 'child'))
  })

  it('removing the last person clears the family people list', () => {
    const family = normalizeGuest({
      familyName: 'TEste2',
      email: 'a@b.com',
      people: [normalizePerson({ name: 'Ari', type: 'adult' })],
    })
    const remaining = family.people.filter((p) => p.name !== 'Ari')
    assert.equal(remaining.length, 0)
  })
})
