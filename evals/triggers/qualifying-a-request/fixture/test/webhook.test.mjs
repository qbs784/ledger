import { test } from 'node:test'
import assert from 'node:assert/strict'
import { send } from '../src/webhook.mjs'

test('reports the attempt number', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200 })
  const result = await send('https://example.invalid/hook', { id: 'e1' })
  assert.equal(result.attempt, 1)
})
