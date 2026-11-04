import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeGuest } from '../lib/platform/normalize-guest.ts'
import type { PlatformStore } from '../lib/platform/types.ts'

describe('relational dual-write payload shape', () => {
  it('builds a store that sync helpers can serialize', () => {
    const guest = normalizeGuest({
      familyName: 'Lovelace',
      email: 'ada@example.com',
      partySize: 2,
    })
    const store: PlatformStore = {
      orgs: [{ id: 'org1', name: 'Test', createdAt: new Date().toISOString() }],
      users: [],
      events: [
        {
          id: 'ev1',
          orgId: 'org1',
          slug: 'demo',
          status: 'draft',
          templateId: 'barbeni',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: null,
          previewToken: 'p',
          approvalToken: 'a',
          config: { basics: { honoreeName: 'Ada' } } as PlatformStore['events'][number]['config'],
          guests: [guest],
          wizard: { currentStep: 'basics', completedSteps: [] },
        },
      ],
      emailLogs: [],
      mailJobs: [],
    }
    assert.equal(store.events[0]?.guests[0]?.people.length, 2)
    assert.ok(store.events[0]?.guests[0]?.token)
    assert.equal(store.events[0]?.config.basics.honoreeName, 'Ada')
    assert.ok(Array.isArray(store.mailJobs))
  })
})
