#!/usr/bin/env node
// Behaviour test for the corrupted-observation classifier. Free, offline,
// deterministic.
//
// Why it exists: the classifier decides whether a run's numbers count, so a
// mistake in it does not produce a visible error — it produces a board that
// looks measured. The parser is imported from the harness rather than
// reimplemented, so what these assertions cover is the code that reads real
// transcripts.
//
// Run: node tests/blind-observation.test.mjs

import { readStream, blindObservation } from './trigger-harness.mjs'

let failures = 0
const ok = (label, condition) => {
  if (condition) console.log(`  ok    ${label}`)
  else { console.error(`  FAIL  ${label}`); failures += 1 }
}

/** One assistant tool_use plus its paired tool_result, in the runtime's shape. */
const call = (id, name, input, { isError = false } = {}) => [
  JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } }),
  JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError, content: 'whatever' }] } }),
].join('\n')

const answer = text => JSON.stringify({ type: 'result', subtype: 'success', result: text })

// ---------------------------------------------------------------- the parser

const listed = readStream([call('t1', 'Bash', { command: 'ls -la' }), answer('the directory is empty')].join('\n'))
ok('a listing command is recorded', listed.listings.length === 1 && listed.listings[0].command === 'ls -la')
ok('a listing alone does not count as reading files', listed.readFiles === false)

const alsoRead = readStream([
  call('t1', 'Bash', { command: 'ls -la' }),
  call('t2', 'Read', { file_path: 'docs/acceptance.md' }),
  answer('here is the review'),
].join('\n'))
ok('a successful Read is recorded', alsoRead.readFiles === true)

const failedRead = readStream([
  call('t1', 'Bash', { command: 'ls -la' }),
  call('t2', 'Read', { file_path: 'nope.md' }, { isError: true }),
  answer('cannot find it'),
].join('\n'))
ok('a failed Read does not count as reading files', failedRead.readFiles === false)

const built = readStream([call('t1', 'Bash', { command: 'npm test' }), answer('done')].join('\n'))
ok('a non-listing Bash command is not a listing', built.listings.length === 0)

const aliased = readStream([call('t1', 'Bash', { command: 'eza --icons' }), answer('empty')].join('\n'))
ok('a listing replacement counts as a listing', aliased.listings.length === 1)

// ------------------------------------------------------------ the classifier

ok('blind: broken shell, files present, listing only',
  blindObservation(listed, 4, true) === 'ls -la')

ok('sound: the run read a file as well',
  blindObservation(alsoRead, 4, true) === null)

ok('sound: the fixture really was empty',
  blindObservation(listed, 0, true) === null)

ok('sound: the shell listing works, so nothing is excused',
  blindObservation(listed, 4, false) === null)

ok('sound: the listing itself errored, which is a different class',
  blindObservation(readStream([call('t1', 'Bash', { command: 'ls -la' }, { isError: true }), answer('x')].join('\n')), 4, true) === null)

ok('sound: the run never listed',
  blindObservation(built, 4, true) === null)

ok('a run that only failed to read is still blind',
  blindObservation(failedRead, 4, true) === 'ls -la')

console.log(failures === 0 ? '\nall assertions passed' : `\n${failures} assertion(s) failed`)
process.exit(failures === 0 ? 0 : 1)
