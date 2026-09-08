import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serve } from '../src/auth.mjs'

test('rejects a request with no credentials', async () => {
  const server = await serve(0)
  const { port } = server.address()
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`)
    assert.equal(response.status, 401)
  } finally {
    server.close()
  }
})
