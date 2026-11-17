import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildRsvpPeopleUpdate } from '../lib/platform/rsvp-people.ts'
import type { GuestPerson } from '../lib/platform/types.ts'

const existing: GuestPerson[] = [
  {
    id: 'p1',
    name: 'Ana Cohen',
    type: 'adult',
    status: 'pending',
    meal: '',
    dietary: '',
  },
  {
    id: 'p2',
    name: 'Leo Cohen',
    type: 'child',
    status: 'pending',
    meal: '',
    dietary: '',
  },
]

describe('buildRsvpPeopleUpdate', () => {
  it('keeps known names/types on closed RSVP and only updates status/meal', () => {
    const result = buildRsvpPeopleUpdate({
      existing,
      submitted: [
        { id: 'p1', name: 'Hacker', type: 'child', status: 'yes', meal: 'Fish', dietary: 'nuts' },
        { id: 'p2', name: 'Other', status: 'no', meal: 'Chicken', dietary: 'x' },
      ],
      openRsvp: false,
      allowPlusOne: false,
      collectMeal: true,
      collectDietary: true,
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.people.length, 2)
    assert.deepEqual(result.people[0], {
      id: 'p1',
      name: 'Ana Cohen',
      type: 'adult',
      status: 'yes',
      meal: 'Fish',
      dietary: 'nuts',
    })
    assert.deepEqual(result.people[1], {
      id: 'p2',
      name: 'Leo Cohen',
      type: 'child',
      status: 'no',
      meal: '',
      dietary: '',
    })
  })

  it('rejects foreign ids and incomplete closed roster', () => {
    const foreign = buildRsvpPeopleUpdate({
      existing,
      submitted: [
        { id: 'p1', status: 'yes' },
        { id: 'evil', status: 'yes', name: 'X' },
      ],
      openRsvp: false,
      allowPlusOne: false,
      collectMeal: false,
      collectDietary: false,
    })
    assert.equal(foreign.ok, false)

    const incomplete = buildRsvpPeopleUpdate({
      existing,
      submitted: [{ id: 'p1', status: 'yes' }],
      openRsvp: false,
      allowPlusOne: false,
      collectMeal: false,
      collectDietary: false,
    })
    assert.equal(incomplete.ok, false)
  })

  it('allows plus-one with a free name when enabled', () => {
    const result = buildRsvpPeopleUpdate({
      existing,
      submitted: [
        { id: 'p1', status: 'yes' },
        { id: 'p2', status: 'yes' },
        { name: 'Plus One', type: 'adult', status: 'yes', meal: 'Veg' },
      ],
      openRsvp: false,
      allowPlusOne: true,
      collectMeal: true,
      collectDietary: false,
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.people.length, 3)
    assert.equal(result.people[2]?.name, 'Plus One')
    assert.equal(result.people[2]?.meal, 'Veg')
    assert.notEqual(result.people[2]?.id, 'p1')
  })

  it('requires names for open RSVP rows', () => {
    const missing = buildRsvpPeopleUpdate({
      existing: [],
      submitted: [{ status: 'yes', name: '  ' }],
      openRsvp: true,
      allowPlusOne: false,
      collectMeal: false,
      collectDietary: false,
    })
    assert.equal(missing.ok, false)

    const ok = buildRsvpPeopleUpdate({
      existing: [],
      submitted: [{ status: 'yes', name: 'Maya', type: 'child' }],
      openRsvp: true,
      allowPlusOne: false,
      collectMeal: false,
      collectDietary: false,
    })
    assert.equal(ok.ok, true)
    if (!ok.ok) return
    assert.equal(ok.people[0]?.name, 'Maya')
    assert.equal(ok.people[0]?.type, 'child')
  })
})
