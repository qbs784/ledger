import { test } from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../src/renderer.mjs'
test('renders pairs', () => assert.equal(render([{ key: 'a', value: '1' }]), 'a=1'))
