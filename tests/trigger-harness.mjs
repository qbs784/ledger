#!/usr/bin/env node
// Offline trigger harness.
//
// The pack's central claim is that its 16 descriptions cause the right skill to
// load. That claim has never been measured. The official eval runner is gated to
// early access, so this drives `claude -p` directly against the same case files
// and reports whether the Skill tool actually fired.
//
// This is NOT the official runner and its numbers are not the runner's:
//   - it isolates with `--setting-sources ""` where the runner uses `user`;
//   - it counts only Skill calls that successfully LOADED, where the runner
//     counts any tool_use block;
//   - it runs one arm, so a pass shows the skill fired, not that the pack
//     caused it to.
//
// Run: node tests/trigger-harness.mjs [--dry-run] [--case <name>] [--keep-temp]
//
// SPENDS REAL MONEY. Never wire this into CI: the calls are billed and
// nondeterministic, which is the exact profile diagnosing-flakes warns against.

import { readdirSync, readFileSync, existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawn, execFileSync } from 'node:child_process'

const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CASES_DIR = join(PACK, 'evals', 'triggers')
const MODEL = process.env.LEDGER_TRIGGER_MODEL ?? 'sonnet'
const BUDGET_USD = process.env.LEDGER_TRIGGER_BUDGET ?? '0.50'
// The default stage when a case names no tools of its own. It must be wide
// enough that doing the task is possible, or the measurement degrades into
// "was loading a skill the only available move" — with read-only tools it very
// nearly is, and the first boards were taken that way.
const TOOLS = ['Skill', 'Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash']

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const KEEP_TEMP = args.includes('--keep-temp')
// Isolation makes the measurement optimistic: it strips the operator's own
// skills, plugins and hooks, so nothing competes with the pack. A real session
// has a populated catalog, and a description that wins on an empty stage may
// lose to a built-in or a personal skill on a full one. This mode measures that
// stage instead.
const REAL_ENV = args.includes('--real-environment')
// The pack ships its router injection enabled, and `--plugin-dir` activates it
// (verified: the hook fires even under `--setting-sources ""`, because a plugin
// hook does not come from the operator's settings). So the default measurement
// is of the SHIPPED configuration. To measure the descriptions alone, this mode
// points the run at a copy of the pack with `hooks/` removed — the only way to
// get a baseline now that the injection is on by default.
const NO_ROUTER = args.includes('--no-router')
const ONLY = args.includes('--case') ? args[args.indexOf('--case') + 1] : undefined

/**
 * Parse exactly the YAML subset the case files use, and reject anything else.
 * A lenient reader that silently misinterprets a grader is worse than no
 * harness: it would report a verdict against a rule nobody wrote.
 */
export function parseCase(text, file) {
  const doc = { graders: [] }
  const lines = text.split('\n')
  let context = null

  const scalar = raw => {
    const value = raw.trim()
    if (value === '[]') return []
    // Flow sequence, so a case can name its own tools: [Skill, Read, Edit]
    const flow = /^\[(.+)\]$/.exec(value)
    if (flow) return flow[1].split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')).filter(item => item !== '')
    if (/^-?\d+$/.test(value)) return Number(value)
    if (/^".*"$|^'.*'$/.test(value)) return value.slice(1, -1)
    return value
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    const indent = line.length - line.trimStart().length

    if (indent === 0) {
      const match = /^([a-z_]+):\s*(.*)$/.exec(line)
      if (!match) throw new Error(`${file}:${index + 1}: unsupported top-level line ${JSON.stringify(line)}`)
      const [, key, rest] = match
      if (key === 'execution') { doc.execution = {}; context = 'execution'; continue }
      if (key === 'graders') { context = 'graders'; continue }
      doc[key] = scalar(rest)
      context = null
      continue
    }

    if (context === 'execution') {
      const match = /^\s+([a-z_]+):\s*(.*)$/.exec(line)
      if (!match) throw new Error(`${file}:${index + 1}: unsupported execution line ${JSON.stringify(line)}`)
      doc.execution[match[1]] = scalar(match[2])
      continue
    }

    if (context === 'graders') {
      const start = /^\s+-\s+([a-z_]+):\s*(.*)$/.exec(line)
      if (start) { doc.graders.push({ [start[1]]: scalar(start[2]) }); continue }
      const field = /^\s+([a-z_]+):\s*(\|)?\s*(.*)$/.exec(line)
      if (!field) throw new Error(`${file}:${index + 1}: unsupported grader line ${JSON.stringify(line)}`)
      const grader = doc.graders[doc.graders.length - 1]
      if (grader === undefined) throw new Error(`${file}:${index + 1}: grader field before any grader`)
      if (field[2] === '|') {
        // Block scalar: consume the more-indented lines that follow.
        const block = []
        const fieldIndent = line.length - line.trimStart().length
        while (index + 1 < lines.length) {
          const next = lines[index + 1]
          if (next.trim() !== '' && next.length - next.trimStart().length <= fieldIndent) break
          block.push(next.trim())
          index += 1
        }
        grader[field[1]] = block.join(' ').trim()
        continue
      }
      grader[field[1]] = scalar(field[3])
      continue
    }

    throw new Error(`${file}:${index + 1}: indented line outside any known block`)
  }

  if (typeof doc.schema_version !== 'string') throw new Error(`${file}: missing schema_version`)
  if (doc.execution === undefined || typeof doc.execution.prompt !== 'string') throw new Error(`${file}: missing execution.prompt`)
  return doc
}

/** Strip a `plugin:` namespace so `ledger:diagnosing-flakes` compares against `diagnosing-flakes`. */
const bareSkill = value => (typeof value === 'string' ? value.split(':').pop() : undefined)

/**
 * Collect Skill invocations from the stream, with their outcomes.
 *
 * One address only: a `tool_use` block named `Skill` inside an `assistant`
 * event. Never grep the raw text — the init event enumerates every skill in the
 * catalog on every run, so a text search reports a hit no matter what the model
 * did. Scan every assistant event and every block, because one model message is
 * split across several events.
 */
function readStream(text) {
  const calls = new Map()
  let unparseable = 0
  let hooks = 0
  let init
  let result
  let routerInjected = false
  const traceParts = []

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    let event
    try {
      event = JSON.parse(line)
    } catch {
      unparseable += 1
      continue
    }
    if (event.subtype === 'init') init = event
    if (event.subtype === 'hook_started') hooks += 1
    if (event.subtype === 'hook_response' && /using-ledger/.test(event.output ?? event.stdout ?? '')) routerInjected = true
    if (event.type === 'result') result = event

    if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
      for (const block of event.message.content) {
        if (block.type === 'text' && block.text) traceParts.push(block.text)
        if (block.type === 'tool_use') {
          traceParts.push(`${block.name} ${JSON.stringify(block.input ?? {})}`)
          if (block.name === 'Skill') {
            calls.set(block.id, { skill: bareSkill(block.input?.skill), raw: block.input, loaded: undefined })
          }
        }
      }
    }
    if (event.type === 'user' && Array.isArray(event.message?.content)) {
      for (const block of event.message.content) {
        if (block.type === 'tool_result' && calls.has(block.tool_use_id)) {
          calls.get(block.tool_use_id).loaded = block.is_error !== true
        }
      }
    }
  }
  // `last_message` is the runner's default grading target: the assistant's final
  // answer. `trace` is approximated as every assistant text block plus every
  // tool call, in order — enough to grade "did it ever look at X", not
  // byte-identical to whatever the official runner concatenates.
  const lastMessage = typeof result?.result === 'string' ? result.result : ''
  return {
    calls: [...calls.values()],
    unparseable, hooks, init, result, routerInjected,
    targets: { last_message: lastMessage, trace: traceParts.join('\n'), files: '' },
  }
}

/**
 * Score a `file_exists` grader against the files the run created.
 *
 * The runner's semantics, kept deliberately: this list holds only files that
 * did not exist before the run, so a case whose right answer is to *edit* an
 * existing document cannot be graded this way and must not try.
 */
export function scoreFileExistsGrader(grader, stream) {
  if (typeof grader.path !== 'string' || grader.path === '') {
    return { state: 'MISCONFIGURED', detail: 'file_exists grader has no path' }
  }
  const created = stream.created ?? []
  // A glob limited to what the runner's own vocabulary needs: `*` within a path
  // segment and `**` across segments.
  const expression = grader.path
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '(?:[^/]+/)*')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
  const pattern = new RegExp(`^${expression}$`)
  const hits = created.filter(path => pattern.test(path))
  const wanted = String(grader.exists ?? 'true') !== 'false'
  const pass = wanted ? hits.length > 0 : hits.length === 0
  return {
    state: pass ? 'PASS' : 'FAIL',
    detail: `${hits.length} of ${created.length} created file(s) match ${grader.path}, expected exists=${wanted}`,
  }
}

/**
 * Score a `regex` grader — the runner's cheapest outcome check, and the reason
 * this harness can grade an answer at all rather than only a route.
 *
 * `match` is the runner's own vocabulary: `contains` (at least one hit),
 * `not_contains` (none), or `count:N` (exactly N). An unimplemented `target` is
 * MISCONFIGURED rather than UNSCORED, because a target this harness cannot read
 * would otherwise let a grader sit in a case file looking scored forever.
 */
export function scoreRegexGrader(grader, stream) {
  if (typeof grader.pattern !== 'string' || grader.pattern === '') {
    return { state: 'MISCONFIGURED', detail: 'regex grader has no pattern' }
  }
  const target = grader.target ?? 'last_message'
  const haystack = stream.targets[target]
  if (haystack === undefined) {
    return { state: 'MISCONFIGURED', detail: `target ${target} is not readable offline (this harness reads last_message and trace)` }
  }
  const flags = grader.flags ?? ''
  let pattern
  try {
    pattern = new RegExp(grader.pattern, flags.includes('g') ? flags : `${flags}g`)
  } catch (error) {
    return { state: 'MISCONFIGURED', detail: `pattern is not a valid regular expression: ${error.message}` }
  }
  const hits = [...haystack.matchAll(pattern)].length
  const match = grader.match ?? 'contains'
  const exact = /^count:(\d+)$/.exec(match)

  let pass
  if (match === 'contains') pass = hits >= 1
  else if (match === 'not_contains') pass = hits === 0
  else if (exact) pass = hits === Number(exact[1])
  else return { state: 'MISCONFIGURED', detail: `match must be contains | not_contains | count:N, not ${match}` }

  return {
    state: pass ? 'PASS' : 'FAIL',
    detail: `hits=${hits} in ${target} (${haystack.length} chars), expected ${match}`,
  }
}

/**
 * Score one grader. Each bound is counted on its own conservative side: a `min`
 * counts only calls that actually loaded, while a `max` counts every attempt.
 * Excluding a refused call from a `max: 0` negative would green a run in which
 * the model demonstrably reached for the forbidden skill.
 */
function scoreGrader(grader, stream) {
  const calls = stream.calls
  if (grader.type === 'regex') return scoreRegexGrader(grader, stream)
  if (grader.type === 'file_exists') return scoreFileExistsGrader(grader, stream)
  if (grader.type !== 'tool_used') {
    return { state: 'UNSCORED', detail: grader.type === 'llm' ? 'no judge available offline' : `grader type ${grader.type} not implemented` }
  }
  const min = grader.min ?? 1
  const max = grader.max ?? Infinity
  if (min > max) return { state: 'MISCONFIGURED', detail: `unsatisfiable range ${min}..${max}` }

  const matching = calls.filter(call => call.skill === grader.input_match)
  const loaded = matching.filter(call => call.loaded === true).length
  const attempts = matching.length

  // What the official runner would count: an unanchored regex over the input.
  let parity = 0
  try {
    const pattern = new RegExp(grader.input_match)
    parity = calls.filter(call => pattern.test(JSON.stringify(call.raw))).length
  } catch {
    return { state: 'MISCONFIGURED', detail: `input_match is not a valid regular expression: ${grader.input_match}` }
  }

  const pass = loaded >= min && attempts <= max
  return {
    state: pass ? 'PASS' : 'FAIL',
    detail: `loaded=${loaded} attempts=${attempts} parity=${parity} (expected ${min}..${max === Infinity ? '∞' : max})`,
    divergent: parity !== attempts,
  }
}

/**
 * The directory handed to `--plugin-dir`. Normally the pack itself; under
 * --no-router a scratch copy without the injection, built once per process.
 */
let strippedPack
function pluginDir() {
  if (!NO_ROUTER) return PACK
  if (strippedPack === undefined) {
    strippedPack = mkdtempSync(join(tmpdir(), 'ledger-norouter-'))
    cpSync(PACK, strippedPack, {
      recursive: true,
      filter: source => !source.includes(`${PACK}/hooks`) && !source.includes(`${PACK}/.git`),
    })
  }
  return strippedPack
}

/**
 * Every file under `dir`, as paths relative to it, skipping `.git` — a git
 * fixture writes thousands of objects and none of them is a file the model
 * created.
 */
function listFiles(dir, prefix = '') {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue
    const relativePath = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) found.push(...listFiles(join(dir, entry.name), relativePath))
    else found.push(relativePath)
  }
  return found
}

function buildArgv(prompt, execution) {
  // A case may name its own tools. `allowed_tools: []` is the runner's default
  // and means "do not restrict", so an empty list falls back to this harness's
  // default stage rather than to nothing.
  const requested = Array.isArray(execution.allowed_tools) && execution.allowed_tools.length > 0
    ? execution.allowed_tools
    : TOOLS
  const argv = [
    '-p', prompt,
    '--output-format', 'stream-json',
    '--verbose',                       // without it, -p + stream-json emits zero bytes and every negative passes vacuously
    // The runner's own default is 10. Anything lower starves the run: a case
    // that ends at max_turns produces no final answer at all, and an
    // answer-shaped grader then fails for a reason that has nothing to do with
    // the skill. Six of fifteen runs ended that way before this was noticed.
    '--max-turns', String(execution.max_turns ?? 10),
    '--plugin-dir', pluginDir(),
    '--allowed-tools', ...requested,
    '--permission-mode', 'dontAsk',
    '--model', MODEL,
    '--no-session-persistence',
    '--max-budget-usd', BUDGET_USD,
  ]
  if (!REAL_ENV) {
    argv.push(
      '--setting-sources', '',      // drops the operator's personal skills, plugins, MCP servers and hooks
      '--strict-mcp-config',
      '--tools', requested.join(','),   // never "" (removes the Skill tool) and never "Skill" alone (triggering becomes the only move)
    )
  }
  // A model id that cannot resolve exercises every preflight and the init event,
  // then exits before any billable call.
  if (DRY_RUN) argv.push('--model', 'claude-nonexistent-dry-run-probe')
  return argv
}

function runCase(testCase, capturesDir, suffix = '') {
  const cwd = mkdtempSync(join(tmpdir(), 'ledger-trigger-'))

  // A prompt naming a file needs that file to exist, or the run measures what
  // the model does when the subject is absent — it globs, finds nothing, and
  // asks a clarifying question without ever reaching a skill decision. A case
  // may ship a `fixture/` directory beside its case.yaml; its contents are
  // copied into the scratch cwd. Rewriting the prompt until it passes instead
  // would be tuning the test to the answer.
  const caseDir = dirname(testCase.file)
  const fixture = join(caseDir, 'fixture')
  if (existsSync(fixture)) cpSync(fixture, cwd, { recursive: true })

  // Some prompts are about a repository — a branch, a diff, what changed. Given
  // an empty directory the model correctly reports that there is nothing to
  // look at and never reaches a skill decision, so the case measures the
  // absence of a subject rather than the description. `fixture_git: true` makes
  // the subject real.
  //
  // Declarative on purpose, and it stays that way. A `fixture.sh` per case would
  // be far shorter than what follows, and it would mean that cloning this
  // repository and running the suite executes shell contributed by whoever sent
  // the last pull request. The harness owns every command here instead, and the
  // vocabulary grows only when a case genuinely cannot be built without it.
  //
  //   fixture/                 committed as `main`
  //   fixture-branch/          committed as the working branch
  //   fixture-base-moved/      a later commit on `main`, so the merge base is
  //                            not main's tip
  //   fixture-remote-ahead/    a commit pushed to `origin` by someone else and
  //                            deliberately not fetched
  if (String(testCase.doc.fixture_git) === 'true') {
    const env = { ...process.env, GIT_AUTHOR_NAME: 'fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' }
    const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd, env, stdio: 'ignore' })
    const commitDir = (name, message) => {
      const source = join(caseDir, name)
      if (!existsSync(source)) return false
      cpSync(source, cwd, { recursive: true })
      git('add', '-A')
      git('commit', '-q', '-m', message)
      return true
    }

    git('init', '-q', '-b', 'main')
    git('add', '-A')
    git('commit', '-q', '-m', 'base')

    // A branch whose merge base is not main's tip. Without this, "what does my
    // branch change compared to what it merges into" has the same answer under
    // every wrong method, so the case cannot tell a verified base from a guess.
    const branch = typeof testCase.doc.fixture_branch === 'string' ? testCase.doc.fixture_branch : 'review-me'
    git('checkout', '-q', '-b', branch)
    commitDir('fixture-branch', 'the change under review')

    // A second candidate base. "I retargeted it yesterday" means the branch was
    // cut from one branch and is now meant to merge into another, so the diff
    // against the wrong base is plausible, non-empty, and wrong — which is the
    // only state in which a verified base can be told apart from a guessed one.
    if (typeof testCase.doc.fixture_other_base === 'string') {
      const other = testCase.doc.fixture_other_base
      git('checkout', '-q', 'main')
      git('checkout', '-q', '-b', other)
      if (!commitDir('fixture-other-base', `work that landed on ${other}`)) {
        throw new Error(`${testCase.name}: fixture_other_base is set but fixture-other-base/ does not exist`)
      }
      git('checkout', '-q', branch)
    }

    if (String(testCase.doc.fixture_base_moved) === 'true') {
      git('checkout', '-q', 'main')
      if (!commitDir('fixture-base-moved', 'main moved on after the branch was cut')) {
        throw new Error(`${testCase.name}: fixture_base_moved is set but fixture-base-moved/ does not exist`)
      }
      git('checkout', '-q', branch)
    }

    // A real `origin`, so a push is a push and `git log origin/<branch>` says
    // something. A bare repository in a sibling directory: no network, and
    // nothing outside the scratch tree is reachable.
    if (String(testCase.doc.fixture_remote) === 'true') {
      const remote = `${cwd}-origin.git`
      execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote], { env, stdio: 'ignore' })
      git('remote', 'add', 'origin', remote)
      git('push', '-q', 'origin', 'main', branch)
      git('branch', `--set-upstream-to=origin/${branch}`, branch)

      // Someone else pushed to the branch since. This is what makes a force-push
      // dangerous rather than merely noisy, and it cannot be faked with a flag
      // that only renames things.
      if (String(testCase.doc.fixture_remote_ahead) === 'true') {
        const theirs = `${cwd}-theirs`
        execFileSync('git', ['clone', '-q', '-b', branch, remote, theirs], { env, stdio: 'ignore' })
        const source = join(caseDir, 'fixture-remote-ahead')
        if (!existsSync(source)) {
          throw new Error(`${testCase.name}: fixture_remote_ahead is set but fixture-remote-ahead/ does not exist`)
        }
        cpSync(source, theirs, { recursive: true })
        execFileSync('git', ['add', '-A'], { cwd: theirs, env, stdio: 'ignore' })
        execFileSync('git', ['commit', '-q', '-m', "a teammate's commit, pushed while you were rebasing"], { cwd: theirs, env, stdio: 'ignore' })
        execFileSync('git', ['push', '-q', 'origin', branch], { cwd: theirs, env, stdio: 'ignore' })
        rmSync(theirs, { recursive: true, force: true })
        // Deliberately NOT fetched: the local repository still believes it is up
        // to date, which is the state a person is actually in.
      }
    }
  }
  // Which files the run created. The runner's `files` target and `file_exists`
  // grader both read exactly this list: paths only, and a file that existed
  // before the run never appears even if the model rewrote it. That asymmetry
  // is the runner's, not a shortcut here — it is why a case whose right answer
  // is "edit this document" cannot be graded by file_exists.
  const before = listFiles(cwd)

  const argv = buildArgv(testCase.doc.execution.prompt, testCase.doc.execution)

  const env = {}
  for (const key of ['HOME', 'PATH', 'TERM', 'LANG', 'SHELL', 'USER', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN']) {
    if (process.env[key] !== undefined) env[key] = process.env[key]
  }
  const droppedBaseUrl = process.env.ANTHROPIC_BASE_URL !== undefined

  return new Promise(resolvePromise => {
    const child = spawn('claude', argv, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), (testCase.doc.execution.timeout_seconds ?? 300) * 1000)
    child.stdout.on('data', chunk => { out += chunk })
    child.stderr.on('data', chunk => { err += chunk })
    child.on('error', error => {
      clearTimeout(timer)
      resolvePromise({ spawnError: error.message, cwd })
    })
    child.on('close', code => {
      clearTimeout(timer)
      // Captures live outside the run cwd: the model globs its working
      // directory, and reading the harness's own transcript would let it answer
      // from the capture instead of from a loaded skill.
      const streamPath = join(capturesDir, `${testCase.name}${suffix}.jsonl`)
      writeFileSync(streamPath, out)
      if (err.trim() !== '') writeFileSync(join(capturesDir, `${testCase.name}${suffix}.err`), err)
      const existing = new Set(before)
      const created = listFiles(cwd).filter(path => !existing.has(path)).sort()
      if (!KEEP_TEMP) rmSync(cwd, { recursive: true, force: true })
      resolvePromise({ code, out, err, streamPath, droppedBaseUrl, cwd, created })
    })
  })
}

// ---------------------------------------------------------------- entry point
//
// Guarded: importing this file must not spawn anything. It is a script with
// billable side effects, and an `import()` of it — to reuse the parser, say —
// would otherwise run the whole suite. That is not hypothetical; it happened.

if (import.meta.url !== `file://${process.argv[1]}`) {
  // Imported rather than executed: run nothing. `parseCase` and
  // `scoreRegexGrader` are exported on purpose, so tests/grader-controls.mjs
  // exercises the scorer this harness actually uses rather than a copy of it.
} else {

const caseNames = existsSync(CASES_DIR)
  ? readdirSync(CASES_DIR, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
  : []
if (caseNames.length === 0) {
  console.error(`no cases under ${CASES_DIR}`)
  process.exit(2)
}

const cases = []
let loadFailed = false
for (const name of caseNames) {
  if (ONLY !== undefined && name !== ONLY) continue
  const file = join(CASES_DIR, name, 'case.yaml')
  try {
    cases.push({ name, file, doc: parseCase(readFileSync(file, 'utf8'), `evals/triggers/${name}/case.yaml`) })
  } catch (error) {
    console.error(`REJECTED  ${name}: ${error.message}`)
    loadFailed = true
  }
}

let cliVersion = 'unknown'
try { cliVersion = execFileSync('claude', ['--version'], { encoding: 'utf8' }).trim() } catch { /* reported as unknown below */ }

console.log('ledger offline trigger harness')
console.log('='.repeat(72))
console.log(DRY_RUN
  ? 'DRY RUN — an unresolvable model id; every preflight runs, nothing is billed.'
  : `SPENDS REAL MONEY — ${cases.length} billed run(s), capped at $${BUDGET_USD} each.`)
console.log(`cli=${cliVersion}  model=${DRY_RUN ? 'dry-run probe' : MODEL}  mode=${REAL_ENV ? 'REAL ENVIRONMENT (operator settings loaded)' : `isolated (tools=${TOOLS.join(',')})`}  router=${NO_ROUTER ? 'STRIPPED (descriptions alone)' : 'shipped (injected)'}`)
console.log('')
console.log('This is not `claude plugin eval`. It counts only Skill calls that actually')
console.log('loaded, and runs a single arm — so a pass shows the skill fired, not that this')
console.log('pack caused it to fire.')
console.log(REAL_ENV
  ? 'REAL-ENVIRONMENT mode: the operator\'s own skills, plugins, hooks and MCP\nservers are all loaded and competing. This is the harder and more useful\nnumber — a miss here may be a personal or built-in skill winning rather than a\nweak description, and the observed list below says which.'
  : 'Isolated mode: the operator\'s skills, plugins and hooks are stripped, so this\nis the OPTIMISTIC number. Re-run with --real-environment for the stage a\nreader actually has.')
console.log('='.repeat(72))
console.log('')

const capturesDir = join(PACK, 'evals', 'results', `run-${cliVersion.split(' ')[0]}-${cases.length}case`)
mkdirSync(capturesDir, { recursive: true })

let failed = loadFailed
let unscored = false
const summary = []

for (const testCase of cases) {
  // `runs` is the runner's floor of 3, and until now this harness read the field
  // only to decide whether to print "(n=1)" beside a pass. It never repeated
  // anything, so every board it produced was a set of single samples wearing a
  // number that promised otherwise.
  const runCount = DRY_RUN ? 1 : Math.max(1, Number(testCase.doc.runs ?? 3))
  const attempts = []
  let spawnFailure

  for (let index = 0; index < runCount; index += 1) {
    const suffix = runCount === 1 ? '' : `.run${index + 1}`
    const outcome = await runCase(testCase, capturesDir, suffix)
    if (outcome.spawnError !== undefined) { spawnFailure = outcome.spawnError; break }
    if (outcome.droppedBaseUrl && index === 0) {
      console.log('  note: ANTHROPIC_BASE_URL was set in this shell and was not passed to the child.')
    }
    const stream = readStream(outcome.out)
    stream.targets.files = (outcome.created ?? []).join('\n')
    stream.created = outcome.created ?? []
    attempts.push({ outcome, stream })
  }

  if (spawnFailure !== undefined) {
    console.log(`INVALID   ${testCase.name}: could not spawn claude — ${spawnFailure}\n`)
    unscored = true
    summary.push(['INVALID', testCase.name])
    continue
  }

  if (DRY_RUN) {
    const stream = attempts[0].stream
    const skills = stream.init?.skills?.length ?? 0
    const plugins = (stream.init?.plugins ?? []).map(plugin => plugin.name).join(',') || 'none'
    console.log(`DRY-RUN   ${testCase.name}  init: ${skills} skills visible, plugins=[${plugins}]`)
    continue
  }

  const graderLines = []
  let caseState = 'PASS'

  const unparseable = attempts.reduce((total, attempt) => total + attempt.stream.unparseable, 0)
  if (unparseable > 0) {
    caseState = 'INVALID'
    graderLines.push(`  INVALID  ${unparseable} unparseable stream line(s) across ${runCount} run(s) — a lost assistant line is a lost tool call`)
  }
  const injected = attempts.filter(attempt => attempt.stream.routerInjected).length
  if (NO_ROUTER && injected > 0) {
    caseState = 'INVALID'
    graderLines.push(`  INVALID  --no-router was requested but the router was injected in ${injected} of ${runCount} run(s); this is not a baseline`)
  } else if (attempts.some(attempt => attempt.stream.hooks > 0)) {
    graderLines.push(`  router    ${injected > 0 ? `injected (shipped configuration) in ${injected}/${runCount}` : 'not injected'} — ${attempts[0].stream.hooks} hook(s) fired`)
  }

  for (const grader of testCase.doc.graders) {
    const scores = attempts.map(attempt => scoreGrader(grader, attempt.stream))
    const passes = scores.filter(score => score.state === 'PASS').length

    // One state for the grader across every run. A grader that passes some of
    // the time is PARTIAL and says so — that is the whole reason for running
    // more than once, and collapsing it to PASS or FAIL would throw away the
    // only new information the repeats bought.
    let state
    if (scores.some(score => score.state === 'MISCONFIGURED')) state = 'MISCONFIGURED'
    else if (scores.every(score => score.state === 'UNSCORED')) state = 'UNSCORED'
    else if (passes === runCount) state = 'PASS'
    else if (passes === 0) state = 'FAIL'
    else state = 'PARTIAL'

    const detail = state === 'MISCONFIGURED'
      ? scores.find(score => score.state === 'MISCONFIGURED').detail
      : state === 'UNSCORED'
        ? scores[0].detail
        : `${passes}/${runCount} run(s) passed — ${scores.map(score => score.detail).join(' | ')}`
    graderLines.push(`  ${state.padEnd(13)} ${grader.name ?? grader.type}  ${detail}`)

    if (state === 'MISCONFIGURED' || state === 'FAIL') { caseState = caseState === 'INVALID' ? 'INVALID' : 'FAIL'; failed = true }
    else if (state === 'PARTIAL' && caseState === 'PASS') caseState = 'PARTIAL'
    if (state === 'UNSCORED') { unscored = true; if (caseState === 'PASS') caseState = 'PARTIAL' }
    if (scores.some(score => score.divergent)) graderLines.push('                the official runner\'s regex would count this differently')
  }

  const observed = attempts.map((attempt, index) => {
    const calls = attempt.stream.calls
    const text = calls.length === 0
      ? 'no Skill call'
      : calls.map(call => `${call.skill}(${call.loaded === true ? 'loaded' : call.loaded === false ? 'refused' : 'unresolved'})`).join(', ')
    return runCount === 1 ? text : `run ${index + 1}: ${text}`
  }).join('  |  ')

  const cost = attempts.reduce((total, attempt) => total + (attempt.stream.result?.total_cost_usd ?? 0), 0)
  const turns = attempts.map(attempt => attempt.stream.result?.num_turns ?? '?').join(',')
  const subtypes = [...new Set(attempts.map(attempt => attempt.stream.result?.subtype ?? '?'))].join(',')
  const suffix = caseState === 'PASS' && runCount === 1 ? '  (n=1: one sample, not a rate)' : ''

  console.log(`${caseState.padEnd(9)} ${testCase.name}${suffix}`)
  graderLines.forEach(line => console.log(line))
  console.log(`  observed: ${observed}`)
  console.log(`  runs=${runCount} subtype=${subtypes} turns=${turns} cost=$${cost.toFixed(4)}  -> ${attempts[0].outcome.streamPath}`)
  console.log('')
  summary.push([caseState, testCase.name])
}

if (!DRY_RUN) {
  const tally = summary.reduce((into, [state]) => ({ ...into, [state]: (into[state] ?? 0) + 1 }), {})
  console.log('='.repeat(72))
  console.log(Object.entries(tally).map(([state, count]) => `${state}=${count}`).join('  '))
  console.log(`captures: ${capturesDir}`)
  console.log('')
  console.log('A grader marked PARTIAL passed some runs and not others. That is the finding,')
  console.log('not noise to be re-rolled away: at three runs per case an all-green board still')
  console.log('cannot support a claim of 90% or better, which needs n>=29 (0.9^29 = 0.047).')
}

process.exit(failed ? 1 : unscored ? 2 : 0)
}
