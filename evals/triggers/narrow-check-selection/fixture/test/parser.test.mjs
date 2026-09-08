import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/parser.mjs'
test('parses a pair', () => assert.deepEqual(parse('a = 1'), { key: 'a', value: '1' }))
test('rejects garbage', () => assert.throws(() => parse('!!'), SyntaxError))
