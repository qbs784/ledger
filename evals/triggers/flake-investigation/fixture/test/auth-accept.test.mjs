import { test } from 'node:test'
import assert from 'node:assert/strict'
import { issue, isValid, serve } from '../src/auth.mjs'

const sleep = ms => new Promise(done => setTimeout(done, ms))

test('a freshly issued token is still valid after a round trip', async () => {
  const server = await serve(0)
  const { port } = server.address()
  try {
    const token = issue()
    const response = await fetch(`http://127.0.0.1:${port}/`, { headers: { authorization: 'token' } })
    assert.equal(response.status, 200)
    // A round trip plus a little work. Well inside the 180ms window — unless the
    // token happened to be issued near the end of one.
    await sleep(30)
    assert.ok(isValid(token), 'token expired during the request')
  } finally {
    server.close()
  }
})
