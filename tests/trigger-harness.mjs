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
const TOOLS = ['Skill', 'Read', 'Glob', 'Grep']

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
function parseCase(text, file) {
  const doc = { graders: [] }
  const lines = text.split('\n')
  let context = null

  const scalar = raw => {
    const value = raw.trim()
    if (value === '[]') return []
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
        if (block.type === 'tool_use' && block.name === 'Skill') {
          calls.set(block.id, { skill: bareSkill(block.input?.skill), raw: block.input, loaded: undefined })
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
  return { calls: [...calls.values()], unparseable, hooks, init, result, routerInjected }
}

/**
 * Score one grader. Each bound is counted on its own conservative side: a `min`
 * counts only calls that actually loaded, while a `max` counts every attempt.
 * Excluding a refused call from a `max: 0` negative would green a run in which
 * the model demonstrably reached for the forbidden skill.
 */
function scoreGrader(grader, calls) {
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

function buildArgv(prompt, execution) {
  const argv = [
    '-p', prompt,
    '--output-format', 'stream-json',
    '--verbose',                       // without it, -p + stream-json emits zero bytes and every negative passes vacuously
    '--max-turns', String(execution.max_turns ?? 3),
    '--plugin-dir', pluginDir(),
    '--allowed-tools', ...TOOLS,
    '--permission-mode', 'dontAsk',
    '--model', MODEL,
    '--no-session-persistence',
    '--max-budget-usd', BUDGET_USD,
  ]
  if (!REAL_ENV) {
    argv.push(
      '--setting-sources', '',      // drops the operator's personal skills, plugins, MCP servers and hooks
      '--strict-mcp-config',
      '--tools', TOOLS.join(','),   // never "" (removes the Skill tool) and never "Skill" alone (triggering becomes the only move)
    )
  }
  // A model id that cannot resolve exercises every preflight and the init event,
  // then exits before any billable call.
  if (DRY_RUN) argv.push('--model', 'claude-nonexistent-dry-run-probe')
  return argv
}

function runCase(testCase, capturesDir) {
  const cwd = mkdtempSync(join(tmpdir(), 'ledger-trigger-'))

  // A prompt naming a file needs that file to exist, or the run measures what
  // the model does when the subject is absent — it globs, finds nothing, and
  // asks a clarifying question without ever reaching a skill decision. A case
  // may ship a `fixture/` directory beside its case.yaml; its contents are
  // copied into the scratch cwd. Rewriting the prompt until it passes instead
  // would be tuning the test to the answer.
  const fixture = join(dirname(testCase.file), 'fixture')
  if (existsSync(fixture)) cpSync(fixture, cwd, { recursive: true })
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
      const streamPath = join(capturesDir, `${testCase.name}.jsonl`)
      writeFileSync(streamPath, out)
      if (err.trim() !== '') writeFileSync(join(capturesDir, `${testCase.name}.err`), err)
      if (!KEEP_TEMP) rmSync(cwd, { recursive: true, force: true })
      resolvePromise({ code, out, err, streamPath, droppedBaseUrl, cwd })
    })
  })
}

// ---------------------------------------------------------------- entry point
//
// Guarded: importing this file must not spawn anything. It is a script with
// billable side effects, and an `import()` of it — to reuse the parser, say —
// would otherwise run the whole suite. That is not hypothetical; it happened.

if (import.meta.url !== `file://${process.argv[1]}`) {
  // Imported rather than executed: expose nothing, do nothing.
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
  const outcome = await runCase(testCase, capturesDir)
  if (outcome.spawnError !== undefined) {
    console.log(`INVALID   ${testCase.name}: could not spawn claude — ${outcome.spawnError}\n`)
    unscored = true
    summary.push(['INVALID', testCase.name])
    continue
  }
  if (outcome.droppedBaseUrl) console.log('  note: ANTHROPIC_BASE_URL was set in this shell and was not passed to the child.')

  const stream = readStream(outcome.out)
  const graderLines = []
  let caseState = 'PASS'

  if (stream.unparseable > 0) {
    caseState = 'INVALID'
    graderLines.push(`  INVALID  ${stream.unparseable} unparseable stream line(s) — a lost assistant line is a lost tool call`)
  }
  // Router injection is the shipped configuration, so it is reported rather
  // than treated as contamination. It is only a defect when a baseline run
  // asked for the descriptions alone and got the injection anyway.
  if (NO_ROUTER && stream.routerInjected) {
    caseState = 'INVALID'
    graderLines.push('  INVALID  --no-router was requested but the router was injected anyway; this is not a baseline')
  } else if (stream.hooks > 0) {
    graderLines.push(`  router    ${stream.routerInjected ? 'injected (shipped configuration)' : 'not injected'} — ${stream.hooks} hook(s) fired`)
  }
  if (DRY_RUN) {
    const skills = stream.init?.skills?.length ?? 0
    const plugins = (stream.init?.plugins ?? []).map(plugin => plugin.name).join(',') || 'none'
    console.log(`DRY-RUN   ${testCase.name}  init: ${skills} skills visible, plugins=[${plugins}]`)
    continue
  }

  for (const grader of testCase.doc.graders) {
    const score = scoreGrader(grader, stream.calls)
    graderLines.push(`  ${score.state.padEnd(13)} ${grader.name ?? grader.type}  ${score.detail}`)
    if (score.state === 'FAIL' || score.state === 'MISCONFIGURED') { caseState = caseState === 'INVALID' ? 'INVALID' : 'FAIL'; failed = true }
    if (score.state === 'UNSCORED') { unscored = true; if (caseState === 'PASS') caseState = 'PARTIAL' }
    if (score.divergent) graderLines.push('                the official runner\'s regex would count this differently')
  }

  const observed = stream.calls.length === 0
    ? 'no Skill call'
    : stream.calls.map(call => `${call.skill}(${call.loaded === true ? 'loaded' : call.loaded === false ? 'refused' : 'unresolved'})`).join(', ')
  const suffix = caseState === 'PASS' && (testCase.doc.runs ?? 1) === 1 ? '  (n=1: one sample, not a rate)' : ''

  console.log(`${caseState.padEnd(9)} ${testCase.name}${suffix}`)
  graderLines.forEach(line => console.log(line))
  console.log(`  observed: ${observed}`)
  console.log(`  exit=${outcome.code} subtype=${stream.result?.subtype ?? '?'} turns=${stream.result?.num_turns ?? '?'} cost=$${(stream.result?.total_cost_usd ?? 0).toFixed(4)}  -> ${outcome.streamPath}`)
  console.log('')
  summary.push([caseState, testCase.name])
}

if (!DRY_RUN) {
  const tally = summary.reduce((into, [state]) => ({ ...into, [state]: (into[state] ?? 0) + 1 }), {})
  console.log('='.repeat(72))
  console.log(Object.entries(tally).map(([state, count]) => `${state}=${count}`).join('  '))
  console.log(`captures: ${capturesDir}`)
  console.log('')
  console.log('At one run per case an all-green board is one sample per case, not a rate:')
  console.log('a skill that fires half the time shows green half the time. Claiming 90% or')
  console.log('better from an all-green result needs n>=29 (0.9^29 = 0.047).')
}

process.exit(failed ? 1 : unscored ? 2 : 0)
}
