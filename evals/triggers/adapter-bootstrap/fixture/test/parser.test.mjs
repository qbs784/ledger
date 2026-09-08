import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/parser.mjs'

test('splits on the first equals sign', () => {
  assert.deepEqual(parse('port = 8080'), { key: 'port', value: '8080' })
})

test('keeps later equals signs in the value', () => {
  assert.deepEqual(parse('url = a=b'), { key: 'url', value: 'a=b' })
})

test('rejects a line with no equals sign', () => {
  assert.throws(() => parse('port'), SyntaxError)
})
