import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

test('the version-field check passes on this repository', () => {
  const out = execFileSync('node', ['scripts/check-version-field.mjs'], { encoding: 'utf8' })
  assert.match(out, /clean/)
})
