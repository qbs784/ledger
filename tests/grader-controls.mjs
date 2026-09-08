#!/usr/bin/env node
// Positive and negative controls for every `regex` outcome grader in the eval
// corpus. Free, offline, deterministic.
//
// Why this file exists: a regex grader is the cheapest outcome check the runner
// offers, and it is also the one that rots most quietly. Loosen a pattern while
// chasing a phrasing and it becomes always-pass; nobody notices, because the
// board goes green and green is what everyone was hoping for. A grader that has
// never been seen to reject a bad answer is not a grader.
//
// So every regex grader here is pinned from both sides. Positives are excerpts
// from real recorded runs wherever one exists, and say which run. Negatives are
// written by hand: answers a reader would recognise as having missed the point,
// including at least one built specifically to defeat the pattern's structure
// rather than merely to be irrelevant.
//
// Run: node tests/grader-controls.mjs
//      node tests/grader-controls.mjs --self-test
//
// The scorer is imported from the billed harness rather than reimplemented, so
// what these controls verify is the code that grades real runs.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCase, scoreRegexGrader } from './trigger-harness.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CASES_DIR = join(ROOT, 'evals', 'triggers')

/**
 * Controls, keyed by case name then grader name.
 *
 * `source` on a positive names the run it was taken from, so a reader can tell
 * a measured phrasing from an imagined one. A positive with no `source` is
 * synthesized and is weaker evidence: it proves the pattern accepts a phrasing
 * someone thought of, not one a model produced.
 */
const CONTROLS = {
  'reviewing-a-diff': {
    'review names the cache-before-confirm defect': {
      positives: [
        {
          label: 'unaided review, no skill loaded',
          source: 'real-environment run, shipped configuration, 2026-09-08',
          text: 'I reviewed the diff on `review-me` against `base`. Found one correctness bug that shows up in '
            + 'both changed methods.\n\n**Cache is populated before the write is confirmed, with no rollback on '
            + 'failure** — `store.js:17` (`put`) and `store.js:22-23` (`putMany`)',
        },
        {
          label: 'review after the built-in code-review skill loaded',
          source: 'real-environment run, --no-router, 2026-09-08',
          text: 'The diff reorders `put()` so the cache is populated before the backend write resolves, and adds '
            + 'a `putMany()` that does the same for a whole batch.',
        },
        {
          label: 'the failure stated from the write side',
          source: 'real-environment run, shipped configuration, 2026-09-08',
          text: 'The diff reorders put() to populate the cache before the backend write resolves. If the write '
            + 'rejects, the cache still holds the unpersisted value.',
        },
      ],
      negatives: [
        {
          label: 'describes the change without finding the defect',
          text: 'Refactors put() and adds putMany(). The cache is kept in sync with the backend on both paths '
            + 'and the code reads cleanly. Style is consistent. No blocking issues.',
        },
        {
          label: 'generic review with nits only',
          text: 'The diff looks reasonable. Two methods changed in store.js. Consider adding tests for the new '
            + 'batch path and a comment explaining the cache strategy.',
        },
        {
          label: 'built to defeat the pattern: write-failure and cache both present, unrelated',
          text: 'If the backend write fails an exception propagates to the caller, which is correct behaviour. '
            + 'Separately, the cache could use a TTL to bound memory growth.',
        },
      ],
    },
  },
}

const asStream = text => ({ calls: [], targets: { last_message: text, trace: text } })

const caseNames = existsSync(CASES_DIR)
  ? readdirSync(CASES_DIR, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
  : []

const selfTest = process.argv.includes('--self-test')
const failures = []
let checked = 0

for (const name of caseNames) {
  const file = join(CASES_DIR, name, 'case.yaml')
  if (!existsSync(file)) continue
  const doc = parseCase(readFileSync(file, 'utf8'), file)
  for (const grader of doc.graders) {
    if (grader.type !== 'regex') continue
    const control = CONTROLS[name]?.[grader.name]
    if (control === undefined) {
      failures.push(`${name}: regex grader ${JSON.stringify(grader.name)} has no controls in tests/grader-controls.mjs`)
      continue
    }

    // --self-test replaces the pattern with one that matches anything. Every
    // negative must then be reported as a failure; if any still passes, these
    // controls are not actually exercising the pattern.
    const under = selfTest ? { ...grader, pattern: '[\\s\\S]' } : grader

    for (const positive of control.positives) {
      checked += 1
      const score = scoreRegexGrader(under, asStream(positive.text))
      if (score.state !== 'PASS') {
        failures.push(`${name} / ${grader.name}: positive ${JSON.stringify(positive.label)} was not accepted (${score.state}: ${score.detail})`)
      }
    }
    for (const negative of control.negatives) {
      checked += 1
      const score = scoreRegexGrader(under, asStream(negative.text))
      const shouldPass = selfTest
      if ((score.state === 'PASS') !== shouldPass) {
        failures.push(selfTest
          ? `${name} / ${grader.name}: --self-test loosened the pattern to match anything, yet negative ${JSON.stringify(negative.label)} was still rejected — this control does not exercise the pattern`
          : `${name} / ${grader.name}: negative ${JSON.stringify(negative.label)} was accepted — the pattern does not discriminate`)
      }
    }
  }
}

if (selfTest) {
  if (failures.length === 0) {
    console.log(`grader controls --self-test: every one of the ${checked} controls responded to the planted pattern`)
    process.exit(0)
  }
  console.error(`grader controls --self-test: ${failures.length} control(s) did not respond to the planted pattern\n`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

if (failures.length === 0) {
  console.log(`grader controls: clean (${checked} controls across ${Object.keys(CONTROLS).length} case(s))`)
  process.exit(0)
}
console.error(`grader controls: ${failures.length} failure(s)\n`)
for (const failure of failures) console.error(`  ${failure}`)
process.exit(1)
