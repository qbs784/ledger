import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withRetries } from '../src/retry.mjs'

test('retries until the operation succeeds', async () => {
  let calls = 0
  const value = await withRetries(async () => {
    calls += 1
    if (calls < 2) throw new Error('not yet')
    return 'ok'
  })
  assert.equal(value, 'ok')
  assert.equal(calls, 2)
})
