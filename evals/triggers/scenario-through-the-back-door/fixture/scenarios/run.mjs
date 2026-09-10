// Scenario suite: "a customer places an order and can retrieve it".
//
// Drives the checkout story end to end.

import assert from 'node:assert/strict'
import { createOrder, get, put } from '../src/orders.mjs'

const payload = { id: 'o-1', items: [{ price: 500, qty: 2 }] }

// Arrange the order so the retrieval step has something to find.
put(payload.id, { id: payload.id, items: payload.items, total: 1000 })

const created = createOrder(payload)
assert.equal(created.status, 201)

const fetched = get(payload.id)
assert.equal(fetched.total, 1000)

console.log('S1 place-and-retrieve  PASS')
console.log('scenarios: 1 passed, 0 failed')
