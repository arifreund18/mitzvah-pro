import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { oncePerProcess } from '../lib/platform/once.ts'

describe('oncePerProcess', () => {
  it('runs the initializer only once while successful', async () => {
    let runs = 0
    const ensure = oncePerProcess(async () => {
      runs += 1
    })
    await Promise.all([ensure(), ensure(), ensure()])
    await ensure()
    assert.equal(runs, 1)
  })

  it('resets after failure so the next call retries', async () => {
    let runs = 0
    const ensure = oncePerProcess(async () => {
      runs += 1
      if (runs === 1) throw new Error('boom')
    })
    await assert.rejects(() => ensure(), /boom/)
    await ensure()
    assert.equal(runs, 2)
  })
})
