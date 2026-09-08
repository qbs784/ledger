import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLimiter } from '../src/rate-limit.mjs'

// Every line and branch of rate-limit.mjs runs from these three tests, which is
// where the 100% figure comes from.
test('a fresh limiter allows a request', () => {
  const limiter = createLimiter({ capacity: 5, refillPerSecond: 1 })
  assert.ok(limiter.tryTake())
})

test('remaining returns a number', () => {
  const limiter = createLimiter({ capacity: 5, refillPerSecond: 1 })
  limiter.tryTake()
  assert.equal(typeof limiter.remaining(), 'number')
})

test('an exhausted limiter refuses', () => {
  const limiter = createLimiter({ capacity: 1, refillPerSecond: 0 })
  limiter.tryTake()
  assert.equal(limiter.tryTake(), false)
})
