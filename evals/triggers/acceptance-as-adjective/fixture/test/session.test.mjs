import { test } from 'node:test'
import assert from 'node:assert/strict'
import { create, write, isExpired } from '../src/session.mjs'

const DAY = 24 * 60 * 60 * 1000

test('a session used within the window is live', () => {
  create('s1', 0)
  write('s1', 'x', 3 * DAY)
  assert.equal(isExpired('s1', 5 * DAY), false)
})

test('a session untouched past the window is expired', () => {
  create('s2', 0)
  assert.equal(isExpired('s2', 8 * DAY), true)
})
