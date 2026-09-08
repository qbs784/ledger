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
  'adding-a-validator': {
    'requires the check to be seen rejecting': {
      positives: [
        {
          label: 'the measured answer, shipped arm',
          source: 'real-environment run, 2026-09-08',
          text: 'The core gap: "passes on our repo" only proves the valid case works - it doesn\'t prove the check can actually reject anything. 1. **Negative control** - temporarily create/point the check at a config file with the version field stripped, run it, and confirm it fails *for that reason specifically*.',
        },
        {
          label: 'the measured answer, baseline arm',
          source: 'real-environment run, 2026-09-08',
          text: 'Before calling it done: **Negative control**: temporarily create (or point the check at) a config file with the `version` field missing, run the check, and confirm it fails - specifically because of the missing version field, not some unrelated parse error.',
        },
      ],
      negatives: [
        {
          label: 'agrees it is done',
          text: 'Looks good. The check passes on all two config files, so this is ready to merge.',
        },
        {
          label: 'suggests more coverage instead',
          text: 'Add a few more config files to the fixture directory and check that coverage of the script is complete.',
        },
        {
          label: 'built to defeat the pattern: mentions failing, but only as existing behaviour',
          text: 'The check fails fast on a parse error, which is good defensive behaviour. I would add a note in the README about that.',
        },
      ],
    },
  },
  'change-narration-cleanup': {
    'names the narration rather than only tidying prose': {
      positives: [
        {
          label: 'names the vantage problem',
          text: 'Both documents read like a changelog rather than a description of the system. "This used to live in the theme file" and "a later PR wires the worker" describe the history of the change, not the current state, so I removed them and stated what is true now.',
        },
        {
          label: 'states the rule as present-state',
          text: 'Rewritten to present state: a reader arriving today does not need to know where the tokens previously lived, or that a later PR is planned. The chronology is dropped.',
        },
      ],
      negatives: [
        {
          label: 'only shortened it',
          text: 'Tightened both documents and fixed two typos. Theming is now 12 lines instead of 18.',
        },
        {
          label: 'reorganised without noticing',
          text: 'Merged the two documents into one and added a table of contents.',
        },
        {
          label: 'built to defeat the pattern: quotes the phrases while doing nothing',
          text: 'The docs mention that tokens used to live in the theme file and that a later PR wires the worker. Both look fine to me as written.',
        },
      ],
    },
  },
  'claiming-done': {
    'refuses coverage and green CI as evidence of done': {
      positives: [
        {
          label: 'the measured answer, shipped arm',
          source: 'real-environment run, 2026-09-08',
          text: 'No - coverage and green CI are two specific, narrow signals, and neither one answers "is this done." **100% coverage** tells you every line ran, not that the right assertions were made against it. **Green CI** tells you the checks that exist all passed - it says nothing about whether the right checks exist.',
        },
        {
          label: 'the measured answer, baseline arm',
          source: 'real-environment run, 2026-09-08',
          text: '**100% coverage** means every line executed at least once. It says nothing about whether the assertions are meaningful, whether edge cases are actually exercised with correct expected values, or whether the tests would fail if the logic were wrong.',
        },
      ],
      negatives: [
        {
          label: 'agrees it is done',
          text: 'Yes - 100% coverage plus a green CI run is a good place to call this done.',
        },
        {
          label: 'asks for more coverage',
          text: 'Coverage is at 100% but I would add branch coverage on the refill path before shipping.',
        },
        {
          label: 'built to defeat the pattern: says coverage is not yet 100%',
          text: 'Coverage is not 100% on this branch yet, and CI has not run green, so it is not done.',
        },
      ],
    },
  },
  'deleting-an-unused-option': {
    'finds the indirect reader before agreeing to delete': {
      positives: [
        {
          label: 'names the indirect reader',
          text: 'Not dead. `src/retry.mjs` reads it as `config.retryBackoff` and uses the value to index the DELAY table, so deleting the option would leave `delayFor` undefined and every retry would throw.',
        },
        {
          label: 'finds it by following the resolved object',
          text: 'A grep for the option name only finds the declaration, because retry.mjs reaches it through the object returned by resolve(). config.retryBackoff selects the backoff function, so the option is live.',
        },
      ],
      negatives: [
        {
          label: 'agrees to delete',
          text: 'Nothing sets it and nothing reads it, so yes - remove it from DEFAULTS and from the docs table.',
        },
        {
          label: 'checks only the call sites',
          text: 'I grepped the repository for retryBackoff and it appears only in config.mjs, so it looks safe to remove.',
        },
        {
          label: 'built to defeat the pattern: names the file without the finding',
          text: 'The retry logic lives in src/retry.mjs. I did not find any consumer of the option, so it can go.',
        },
      ],
    },
  },
  'documenting-a-command': {
    'states the port the source actually declares': {
      positives: [
        {
          label: 'reports the declared port',
          text: 'Install with `npm install -g @acme/cli`, then run `acme`. It listens on port 7420 by default (DEFAULT_PORT in src/server.mjs); pass `--port` to change it.',
        },
        {
          label: 'quotes the constant',
          text: 'The default is 7420, taken from `export const DEFAULT_PORT = 7420`.',
        },
      ],
      negatives: [
        {
          label: 'fabricates a common port',
          text: 'Install with npm install -g @acme/cli. The server listens on port 3000 by default.',
        },
        {
          label: 'fabricates another',
          text: 'Getting Started: run acme and open http://localhost:8080.',
        },
        {
          label: 'built to defeat the pattern: a nearby but wrong number',
          text: 'The CLI is version 0.4.1 and serves on port 7402 unless --port is given.',
        },
      ],
    },
  },
  'finding-the-change-set': {
    'uses the retargeted base rather than main': {
      positives: [
        {
          label: 'names the retargeted base',
          text: 'Since you retargeted it, the base is release-1.4, not main. Against release-1.4 your branch changes src/report.mjs and adds src/stats.mjs; it does not carry the version bump.',
        },
        {
          label: 'computes the merge base',
          text: 'I took the merge base of your branch and its target rather than diffing against a branch tip, because main has moved on since the branch was cut.',
        },
      ],
      negatives: [
        {
          label: 'diffs against main',
          text: 'Compared with main, your branch changes src/report.mjs and adds src/stats.mjs.',
        },
        {
          label: 'diffs against the tip',
          text: 'git diff main..HEAD shows two files changed. That is your change set.',
        },
        {
          label: 'built to defeat the pattern: mentions retargeting without using it',
          text: 'You mentioned retargeting the branch. Against main it changes two files, which should be what you want.',
        },
      ],
    },
  },
  'flake-investigation': {
    'reaches the expiry-window cause': {
      positives: [
        {
          label: 'names the window boundary',
          text: 'The token expires at the end of the 180ms window it was issued in, so how much life a fresh token has depends on where in that window it was issued. The test sleeps 30ms, so it fails whenever issuance landed near the end of a window - roughly one run in three.',
        },
        {
          label: 'states it as remaining life',
          text: 'issue() rounds down to a window and expires at the boundary, so the remaining validity varies from the full window to almost nothing. That is the intermittency; the port is not involved.',
        },
      ],
      negatives: [
        {
          label: 'blames the port',
          text: 'This is a port conflict - both test files bind the same port, so you get EADDRINUSE intermittently.',
        },
        {
          label: 'suggests a retry',
          text: 'Mark the test as flaky and add two retries in CI so it stops blocking merges.',
        },
        {
          label: 'built to defeat the pattern: quotes the symptom only',
          text: 'The failure message is "token expired during the request" and it appears in about a third of runs. I would add logging around the token.',
        },
      ],
    },
  },
  'force-pushing-after-rebase': {
    'requires a lease on the force push': {
      positives: [
        {
          label: 'names the lease',
          text: 'Fetch first, then push with `git push --force-with-lease=fix-slug:<the oid you observed>`. A teammate has a commit on origin that this clone has never seen, and a bare --force would delete it.',
        },
        {
          label: 'uses the flag in the command',
          text: 'git fetch origin && git push --force-with-lease origin fix-slug',
        },
      ],
      negatives: [
        {
          label: 'bare force',
          text: 'Run git push --force origin fix-slug. That will overwrite the remote with your rebased branch.',
        },
        {
          label: 'short form',
          text: 'Just git push -f and you are done.',
        },
        {
          label: 'built to defeat the pattern: warns without the flag',
          text: 'Be careful with a force push after a rebase - a teammate may have pushed. Check with git log origin/fix-slug first, then push --force.',
        },
      ],
    },
  },
  'narrow-check-selection': {
    'names the narrow lane rather than the suite': {
      positives: [
        {
          label: 'names the lane script',
          text: 'Run `npm run test:parser`. That is the check that would actually fail if the parser change is wrong; CI already owns lint, typecheck, build and duplication on every push.',
        },
        {
          label: 'names the test file',
          text: 'Only test/parser.test.mjs is affected, so run that file rather than the whole suite.',
        },
      ],
      negatives: [
        {
          label: 'runs everything',
          text: 'Run npm test, npm run lint, npm run typecheck and npm run build before pushing.',
        },
        {
          label: 'defers to CI without narrowing',
          text: 'Push it and let CI tell you. It runs everything anyway.',
        },
        {
          label: 'built to defeat the pattern: mentions the parser but runs the suite',
          text: 'Your change is in the parser, so run npm test to be safe - the full suite is fast enough.',
        },
      ],
    },
  },
  'new-fixture-isolation': {
    'allocates the port and directory rather than fixing them': {
      positives: [
        {
          label: 'allocates both',
          text: 'Bind port 0 and read the assigned port from server.address(), and create the directory with mkdtempSync(join(tmpdir(), "acme-")). Remove it in a finally block so a failed run leaves nothing behind.',
        },
        {
          label: 'names the ephemeral port',
          text: 'Use an ephemeral port rather than a constant: listen(0) then read the real port. The existing fixture hardcodes 8123, which is why the suite cannot run twice at once.',
        },
      ],
      negatives: [
        {
          label: 'copies the bad pattern',
          text: 'Use port 8124 and /tmp/acme-upload-test-2 so it does not clash with the existing fixture.',
        },
        {
          label: 'picks a range',
          text: 'Pick a port above 8000 that nothing else uses, and a temp directory under /tmp.',
        },
        {
          label: 'built to defeat the pattern: mentions ports and temp dirs abstractly',
          text: 'The fixture needs a port and a temporary directory. I would put both in a constants file so they are easy to change later.',
        },
      ],
    },
  },
  'recording-a-ui-demo': {
    'anchors the recording to a served build or a commit': {
      positives: [
        {
          label: 'serves the built app',
          text: 'Build it and serve the build - npm run build && npm run preview puts it on 4173 - then record against that, so the demo shows what the commit produces rather than whatever is in your working tree.',
        },
        {
          label: 'anchors to the commit',
          text: 'Record the demo against the pushed commit, and name that sha in the pull request beside the recording, so a reader can tell which build the capture shows.',
        },
      ],
      negatives: [
        {
          label: 'records the working tree',
          text: 'Run npm run dev, screen-record the settings screen, and drag the gif into the pull request.',
        },
        {
          label: 'describes instead of recording',
          text: 'Add a paragraph to the PR describing the new three-click flow.',
        },
        {
          label: 'built to defeat the pattern: mentions a demo and a commit separately',
          text: 'Attach a demo to the pull request. Commit the change first so the branch is pushed.',
        },
      ],
    },
  },
  'retiring-a-decision-record': {
    'refuses age and count as the criterion': {
      positives: [
        {
          label: 'the measured answer — the phrasing this pattern originally missed',
          source: 'real-environment run, shipped configuration, 2026-09-08',
          text: 'I read all 60 files. The content is templated (identical boilerplate per status), so there is no '
            + 'distinguishing rationale in the prose - classification has to rest on status + date + chronology '
            + 'per topic, not on age or count.',
        },
        {
          label: 'refuses age outright',
          text: 'How old a record is, is not a criterion - some of the 2019 records are still exactly how the system works. What retires a record is its status and whether anything still points at it: the ten marked Superseded and the ten marked Deprecated are the candidates.',
        },
        {
          label: 'routes to status and references',
          text: 'Sort by status and by incoming references, not the date. One Superseded record points at a successor that was never written, so that link is dead and needs deciding rather than deleting.',
        },
      ],
      negatives: [
        {
          label: 'cuts by age',
          text: 'Delete anything dated before 2022. That takes the folder from sixty files to about thirty.',
        },
        {
          label: 'cuts by count',
          text: 'Keep the twenty most recent and archive the rest - sixty is too many to read.',
        },
        {
          label: 'built to defeat the pattern: mentions status but still sorts by date',
          text: 'Most of these are old. I would list them by date, check the status field on the oldest twenty, and remove those.',
        },
      ],
    },
  },
  'shorten-a-readme': {
    'identifies the repeated presentation rather than only cutting length': {
      positives: [
        {
          label: 'names the threefold repetition',
          text: 'The method list and the options table are each presented three times - once inline under Usage, once under API Reference, and once under Configuration. Give each one home and link to it; that is most of the 900 lines.',
        },
        {
          label: 'states the one-home rule',
          text: 'Every fact needs a single home. The options appear as a table twice and as prose once, so the same defaults are maintained in three places and will drift.',
        },
      ],
      negatives: [
        {
          label: 'cuts filler only',
          text: 'Removed the repeated FAQ entry and tightened the prose. Down to about 500 lines.',
        },
        {
          label: 'cuts by length',
          text: 'Deleted 400 lines of examples. It reads much faster now.',
        },
        {
          label: 'built to defeat the pattern: counts sections without the finding',
          text: 'The README has three main sections plus a FAQ. I trimmed the FAQ, which was the bulk of it.',
        },
      ],
    },
  },
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
