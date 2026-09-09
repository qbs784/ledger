#!/usr/bin/env node
// Replay every outcome grader against recorded transcripts and print the
// answers it rejected, so a person can decide whether the answer was wrong or
// the grader was.
//
// This exists because of an asymmetry that cost a real conclusion. Controls in
// tests/grader-controls.mjs pin each pattern from both sides, and its
// --self-test catches a pattern that has drifted into accepting anything. None
// of that catches the opposite failure: a pattern narrow enough to reject a
// correct answer phrased in words nobody thought of. That is not hypothetical
// — `retiring-a-decision-record` scored 0/3 against answers that had done
// exactly what the case asks, and the board reported a failure of the pack.
//
// A rejected answer is a question, not a verdict. Read it, then either fix the
// skill, widen the pattern and pin the new phrasing as a sourced positive, or
// record that the answer really was wrong.
//
// Run: node tests/audit-failures.mjs                      # every captures dir
//      node tests/audit-failures.mjs <dir>                # one of them
//      node tests/audit-failures.mjs --full               # whole answer, not an excerpt

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCase, scoreRegexGrader, scoreFileExistsGrader } from './trigger-harness.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RESULTS = join(ROOT, 'evals', 'results')
const CASES = join(ROOT, 'evals', 'triggers')

const args = process.argv.slice(2)
const FULL = args.includes('--full')
const only = args.filter(arg => !arg.startsWith('--'))

/** The final assistant answer, which is what an answer-shaped grader reads. */
function lastMessage(path) {
  let text = ''
  let subtype
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue
    let event
    try { event = JSON.parse(line) } catch { continue }
    if (event.type !== 'result') continue
    subtype = event.subtype
    if (typeof event.result === 'string') text = event.result
  }
  return { text, subtype }
}

const directories = only.length > 0
  ? only.map(name => (existsSync(name) ? name : join(RESULTS, name)))
  : (existsSync(RESULTS) ? readdirSync(RESULTS, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => join(RESULTS, entry.name)) : [])

let rejected = 0
let truncated = 0
let read = 0

for (const directory of directories.sort()) {
  const files = existsSync(directory) ? readdirSync(directory).filter(name => name.endsWith('.jsonl')).sort() : []
  if (files.length === 0) continue
  let header = false

  for (const file of files) {
    const caseName = basename(file, '.jsonl').replace(/\.run\d+$/, '')
    const casePath = join(CASES, caseName, 'case.yaml')
    if (!existsSync(casePath)) continue
    const doc = parseCase(readFileSync(casePath, 'utf8'), casePath)
    const { text, subtype } = lastMessage(join(directory, file))
    read += 1

    // A run cut off before it answered has no answer to audit. It is a missing
    // observation in the board and it is a missing observation here too.
    if (subtype === 'error_max_turns' || subtype === 'error_max_budget_usd' || text === '') {
      truncated += 1
      continue
    }

    for (const grader of doc.graders) {
      if (grader.type !== 'regex' && grader.type !== 'file_exists') continue
      // file_exists reads created files, which a transcript does not record.
      if (grader.type === 'file_exists') continue
      const score = scoreRegexGrader(grader, { calls: [], created: [], targets: { last_message: text, trace: text } })
      if (score.state === 'PASS') continue

      if (!header) { console.log(`\n${'='.repeat(76)}\n${basename(directory)}\n${'='.repeat(76)}`); header = true }
      rejected += 1
      console.log(`\nREJECTED  ${file}`)
      console.log(`  grader  ${grader.name}`)
      console.log(`  answer  ${text.length} chars\n`)
      const body = FULL ? text : text.slice(0, 1400)
      console.log(body.split('\n').map(line => `    ${line}`).join('\n'))
      if (!FULL && text.length > 1400) console.log(`    … ${text.length - 1400} more characters (--full to see them)`)
    }
  }
}

console.log(`\n${'='.repeat(76)}`)
console.log(`${read} transcript(s) read, ${truncated} with no answer to audit, ${rejected} answer(s) rejected by an outcome grader.`)
console.log('Each rejection is a question. Read the answer: if it did the job, the pattern')
console.log('is too narrow — widen it and pin that phrasing in tests/grader-controls.mjs.')
