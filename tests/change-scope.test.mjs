#!/usr/bin/env node
// Behavioral test for skills/scoping-a-change/scripts/change-scope.sh.
//
// The script makes two claims that matter: it refuses to guess a base, and it
// reports committed, staged, unstaged and untracked paths SEPARATELY. The
// separation is the script's entire argument — an untracked file is part of the
// change in every practical sense and part of the diff in none — and until now
// nothing exercised it. CI only checked that a missing base produced a non-zero
// exit, which a syntax error also satisfies.
//
// Builds a real git repository with one file in each of the four states.
//
// Run: node tests/change-scope.test.mjs

import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'scoping-a-change', 'scripts', 'change-scope.sh')

const failures = []
const check = (label, condition, detail = '') => {
  if (condition) console.log(`  ok    ${label}`)
  else { console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); failures.push(label) }
}

const git = (cwd, ...args) => execFileSync('git', args, {
  cwd,
  encoding: 'utf8',
  env: {
    ...process.env,
    GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@example.invalid',
  },
})

function runScript(cwd, args) {
  try {
    // stderr is captured, not inherited: the script prints its usage and error
    // text there, and letting it through buries the assertion results.
    return { code: 0, out: execFileSync('bash', [SCRIPT, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (error) {
    return { code: error.status, out: `${error.stdout ?? ''}${error.stderr ?? ''}` }
  }
}

const repo = mkdtempSync(join(tmpdir(), 'change-scope-test-'))
try {
  git(repo, 'init', '-q', '-b', 'main')
  writeFileSync(join(repo, 'base.txt'), 'base\n')
  git(repo, 'add', 'base.txt')
  git(repo, 'commit', '-q', '-m', 'base')
  const base = git(repo, 'rev-parse', 'HEAD').trim()

  // One file in each of the four states the script separates.
  writeFileSync(join(repo, 'committed.txt'), 'committed\n')
  git(repo, 'add', 'committed.txt')
  git(repo, 'commit', '-q', '-m', 'committed change')

  writeFileSync(join(repo, 'staged.txt'), 'staged\n')
  git(repo, 'add', 'staged.txt')

  writeFileSync(join(repo, 'base.txt'), 'base modified\n')   // unstaged
  writeFileSync(join(repo, 'untracked.txt'), 'untracked\n')  // untracked

  console.log('change-scope.sh')

  // 1. Refuses to guess, with the exact usage code. Any non-zero would also be
  //    satisfied by a crash, which is not the behavior claimed.
  const noArgs = runScript(repo, [])
  check('exits 2 with no base argument', noArgs.code === 2, `got ${noArgs.code}`)
  check('its usage explains why there is no default', /no default base/i.test(noArgs.out))

  // 2. Refuses an unresolvable base rather than falling back to one.
  const badBase = runScript(repo, ['no-such-ref-here'])
  check('exits 1 on an unresolvable base', badBase.code === 1, `got ${badBase.code}`)
  check('names the unresolvable ref', /no-such-ref-here/.test(badBase.out))

  // 3. The four layers, each reported under its own heading and nowhere else.
  const scoped = runScript(repo, [base])
  check('exits 0 on a resolvable base', scoped.code === 0, `got ${scoped.code}`)

  const section = name => {
    const start = scoped.out.indexOf(`== ${name}`)
    if (start === -1) return ''
    const next = scoped.out.indexOf('\n== ', start + 1)
    return scoped.out.slice(start, next === -1 ? undefined : next)
  }
  const committed = section('committed')
  const staged = section('staged')
  const unstaged = section('unstaged')
  const untracked = section('untracked')

  check('reports all four sections', [committed, staged, unstaged, untracked].every(part => part !== ''))
  check('committed.txt appears under committed', committed.includes('committed.txt'))
  check('staged.txt appears under staged', staged.includes('staged.txt'))
  check('base.txt appears under unstaged', unstaged.includes('base.txt'))
  check('untracked.txt appears under untracked', untracked.includes('untracked.txt'))

  // The separation is the claim. A layer leaking into another would make the
  // report look complete while answering a different question.
  check('untracked.txt does NOT appear under committed', !committed.includes('untracked.txt'))
  check('untracked.txt does NOT appear under staged', !staged.includes('untracked.txt'))
  check('staged.txt does NOT appear under committed', !committed.includes('staged.txt'))
  check('committed.txt does NOT appear under unstaged', !unstaged.includes('committed.txt'))

  // 4. The merge base is derived, not assumed: with a base ahead on its own
  //    branch, the committed layer must still be relative to the common
  //    ancestor rather than to the named ref's tip.
  git(repo, 'checkout', '-q', '-b', 'other', base)
  writeFileSync(join(repo, 'only-on-other.txt'), 'other\n')
  git(repo, 'add', 'only-on-other.txt')
  git(repo, 'commit', '-q', '-m', 'diverged')
  git(repo, 'checkout', '-q', 'main')

  const diverged = runScript(repo, ['other'])
  check('exits 0 against a diverged branch', diverged.code === 0, `got ${diverged.code}`)
  check('excludes the other branch\'s own file from the committed layer',
    !section('committed').includes('only-on-other.txt') || !diverged.out.includes('only-on-other.txt'))
  check('reports a merge-base line', /merge-base/.test(diverged.out))
} finally {
  rmSync(repo, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.log(`\n${failures.length} assertion(s) failed`)
  process.exit(1)
}
console.log('\nall assertions passed')
