import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sweep } from '../src/retention.mjs'

const DAY = 24 * 60 * 60 * 1000

test('sweep processes expired records', () => {
  const store = new Map([['a', { createdAt: 0 }], ['b', { createdAt: 40 * DAY }]])
  const touched = sweep(store, 45 * DAY, 30 * DAY)
  assert.equal(touched, 1)
})
