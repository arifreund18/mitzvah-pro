import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canActorAccessEvent,
  filterEventsForActor,
  normalizeEventIds,
  userEventIds,
} from '../lib/platform/access.ts'
import type { PlatformEvent, PlatformUser } from '../lib/platform/types.ts'

function event(id: string, orgId = 'org-a'): PlatformEvent {
  return {
    id,
    orgId,
    slug: id,
    status: 'draft',
    templateId: 'barbeni',
    createdAt: '',
    updatedAt: '',
    publishedAt: null,
    previewToken: 'p',
    approvalToken: 'a',
    config: {} as PlatformEvent['config'],
    guests: [],
    wizard: { currentStep: 'basics', completedSteps: [] },
  }
}

describe('event access for org members', () => {
  it('normalizes event ids', () => {
    assert.deepEqual(normalizeEventIds([' a ', 'a', '', null]), ['a'])
  })

  it('scopes org_member to assigned events only', () => {
    const member: PlatformUser = {
      id: 'u1',
      email: 'family@example.com',
      name: 'Família',
      passwordHash: 'x',
      role: 'org_member',
      orgId: 'org-a',
      eventIds: ['ev-adissi'],
      createdAt: '',
    }
    const actor = {
      kind: 'user' as const,
      userId: 'u1',
      orgId: 'org-a',
      role: 'org_member' as const,
    }
    const events = [event('ev-adissi'), event('ev-other'), event('ev-foreign', 'org-b')]
    assert.deepEqual(
      filterEventsForActor(events, actor, member).map((row) => row.id),
      ['ev-adissi'],
    )
    assert.equal(canActorAccessEvent(actor, events[0], member), true)
    assert.equal(canActorAccessEvent(actor, events[1], member), false)
    assert.equal(userEventIds(member)?.length, 1)
  })

  it('lets org_owner see all events in the org', () => {
    const owner: PlatformUser = {
      id: 'u2',
      email: 'owner@example.com',
      name: 'Owner',
      passwordHash: 'x',
      role: 'org_owner',
      orgId: 'org-a',
      eventIds: [],
      createdAt: '',
    }
    const actor = {
      kind: 'user' as const,
      userId: 'u2',
      orgId: 'org-a',
      role: 'org_owner' as const,
    }
    const events = [event('ev-adissi'), event('ev-other'), event('ev-foreign', 'org-b')]
    assert.deepEqual(
      filterEventsForActor(events, actor, owner).map((row) => row.id),
      ['ev-adissi', 'ev-other'],
    )
  })
})
