import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync } from 'node:fs'
import { serve } from '../src/uploader.mjs'

// The pattern already in this repository. Both of these are the reason the
// suite cannot be run twice at once, and the reason a failed run leaves state
// behind — worth reading before adding a second fixture beside it.
const PORT = 8123
const DIRECTORY = '/tmp/acme-upload-test'

test('stores an uploaded body', async () => {
  mkdirSync(DIRECTORY, { recursive: true })
  const server = await serve({ port: PORT, directory: DIRECTORY })
  await fetch(`http://127.0.0.1:${PORT}/`, { method: 'POST', body: 'hello' })
  assert.equal(readFileSync(`${DIRECTORY}/upload.bin`, 'utf8'), 'hello')
  server.close()
})
