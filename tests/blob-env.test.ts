import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  blobAccessMode,
  blobReadWriteToken,
  blobUploadsConfigured,
} from '../lib/platform/blob-env.ts'

describe('blob-env', () => {
  const keys = [
    'BLOB_READ_WRITE_TOKEN',
    'BLOB1_READ_WRITE_TOKEN',
    'BLOB_ACCESS',
    'BLOB_STORE_ID',
    'BLOB1_STORE_ID',
  ] as const
  const prev: Record<string, string | undefined> = {}

  for (const key of keys) prev[key] = process.env[key]

  afterEach(() => {
    for (const key of keys) {
      if (prev[key] === undefined) delete process.env[key]
      else process.env[key] = prev[key]
    }
  })

  it('prefers BLOB1_READ_WRITE_TOKEN over legacy BLOB_READ_WRITE_TOKEN', () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'legacy-token'
    process.env.BLOB1_READ_WRITE_TOKEN = 'blob1-token'
    assert.equal(blobReadWriteToken(), 'blob1-token')
    assert.equal(blobUploadsConfigured(), true)

    delete process.env.BLOB1_READ_WRITE_TOKEN
    assert.equal(blobReadWriteToken(), 'legacy-token')
  })

  it('defaults to public when BLOB1_READ_WRITE_TOKEN is set', () => {
    delete process.env.BLOB_ACCESS
    delete process.env.BLOB_READ_WRITE_TOKEN
    process.env.BLOB1_READ_WRITE_TOKEN = 'blob1-token'
    assert.equal(blobAccessMode(), 'public')
  })

  it('respects explicit BLOB_ACCESS=private', () => {
    process.env.BLOB1_READ_WRITE_TOKEN = 'blob1-token'
    process.env.BLOB_ACCESS = 'private'
    assert.equal(blobAccessMode(), 'private')
  })
})
