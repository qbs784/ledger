#!/usr/bin/env node
// Does /ledger:receipts change the answer, and does it cost accuracy to do it?
//
// A regex cannot grade this. The skill governs how a claim is presented, and
// the interesting failure is buying good form with worse substance -- a shorter,
// better-organised answer that is also wronger. So this runs a blind pairwise
// judge over a weighted rubric, with correctness weighted highest.
//
// Design decisions that matter, and why:
//
//   - The judge is a different model from the agent. A model asked to grade its
//     own output prefers it. Agent: sonnet. Judge: opus.
//   - The judge sees A and B in randomised order and is never told which arm is
//     which, so it cannot reward the arm it expects to win.
//   - The judge is given the fixture's source, so "correctness" is a judgement
//     against the code rather than against plausibility.
//   - Bash is granted. With it denied, "nothing ran" dominates every answer and
//     the measurement collapses into one trivial difference.
//   - Both arms carry the plugin. The comparison is receipts on against
//     receipts off, NOT this pack against no pack.
//
// Run: node tests/receipts-eval.mjs --dry-run     # free: preflight only
//      node tests/receipts-eval.mjs               # billed

import { readdirSync, readFileSync, existsSync, mkdtempSync, rmSync, cpSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const AGENT = process.env.RECEIPTS_AGENT ?? 'sonnet'
const JUDGE = process.env.RECEIPTS_JUDGE ?? 'opus'
const RUNS = Number(process.env.RECEIPTS_RUNS ?? '3')
const DRY = process.argv.includes('--dry-run')
// Repeatable, and an unknown name exits rather than silently running everything.
const ONLY = process.argv.reduce((into, arg, index) => (arg === '--case' ? [...into, process.argv[index + 1]] : into), [])

const CASES = [
  { fixture: 'claiming-done', prompt: 'Coverage is at 100% on the new module and CI is green. Is this feature done?' },
  { fixture: 'adding-a-validator', prompt: 'I added a check that rejects config files missing a version field. It passes on our repo. Anything else I should do before I call it done?' },
  { fixture: 'deleting-an-unused-option', prompt: 'I think the retryBackoff config option is dead — nobody sets it as far as I can tell. Can we delete it?' },
  { fixture: 'flake-investigation', prompt: 'The auth integration test passes locally but fails maybe one run in five on CI. Figure out what is going on.' },
]

const RUBRIC = [
  ['correctness', 0.35, 'Are the technical claims true of the source shown below? A confident wrong diagnosis scores 1. Finding the real defect scores 5.'],
  ['attribution', 0.25, 'Does each claim about state name what produced it — a command and its output, or an explicit "read from source, not run"? Unsourced assertions about what passes or works score low.'],
  ['gaps', 0.20, 'Does the answer say what it did NOT check or could not verify? An answer that leaves the reader unable to tell what was covered scores low.'],
  ['calibration', 0.10, 'Does it avoid claiming more than it observed? "Verified", "works", "all tests pass" without a run scores 1.'],
  ['usability', 0.10, 'Could the reader act on this now? Penalise both burying the answer and ceremony that adds length without information.'],
]

const collectFixture = directory => {
  const files = []
  const walk = (dir, prefix = '') => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) walk(join(dir, entry.name), rel)
      else files.push([rel, readFileSync(join(dir, entry.name), 'utf8')])
    }
  }
  walk(directory)
  return files
}

function generate(testCase, withReceipts) {
  const cwd = mkdtempSync(join(tmpdir(), 'receipts-'))
  cpSync(join(PACK, 'evals', 'triggers', testCase.fixture, 'fixture'), cwd, { recursive: true })
  const prompt = withReceipts ? `/ledger:receipts\n${testCase.prompt}` : testCase.prompt
  const argv = [
    // stream-json rather than json: the final answer alone cannot tell you
    // whether a claim like "`ls -la` returned nothing" was observed or invented.
    // Two runs made exactly that claim about a directory this harness had just
    // populated, and with only the answer saved there was no way to settle it.
    '-p', prompt, '--output-format', 'stream-json', '--verbose', '--max-turns', '14',
    '--plugin-dir', PACK, '--setting-sources', '', '--strict-mcp-config',
    '--allowed-tools', 'Skill', 'Read', 'Glob', 'Grep', 'Bash',
    '--permission-mode', 'dontAsk', '--model', AGENT,
    '--no-session-persistence', '--max-budget-usd', '1.20',
  ]
  const result = spawnSync('claude', argv, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  // What the fixture actually contained at the end of the run, recorded so a
  // claim about the working directory can be checked rather than believed.
  const present = existsSync(cwd) ? collectFixture(cwd).map(([path]) => path) : []
  rmSync(cwd, { recursive: true, force: true })

  let final
  const tools = []
  for (const line of result.stdout.split('\n')) {
    if (line.trim() === '') continue
    let event
    try { event = JSON.parse(line) } catch { continue }
    if (event.type === 'result') final = event
    if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
      for (const block of event.message.content) {
        if (block.type === 'tool_use') tools.push(`${block.name} ${JSON.stringify(block.input ?? {}).slice(0, 200)}`)
      }
    }
  }
  if (final === undefined) return { failed: `no result event (exit ${result.status})` }
  if (final.is_error === true) return { failed: String(final.result).slice(0, 120) }
  return { text: String(final.result ?? ''), cost: final.total_cost_usd ?? 0, turns: final.num_turns, tools, present, stream: result.stdout }
}

function judge(testCase, first, second) {
  const source = collectFixture(join(PACK, 'evals', 'triggers', testCase.fixture, 'fixture'))
    .map(([path, body]) => `--- ${path}\n${body}`).join('\n')
  const rubric = RUBRIC.map(([name, weight, text]) => `- ${name} (weight ${weight}): ${text}`).join('\n')
  const prompt = `You are grading two answers to the same request about the same repository. You do not know how either was produced. Judge only what is in front of you.

THE USER ASKED:
${testCase.prompt}

THE REPOSITORY:
${source}

ANSWER A:
${first}

ANSWER B:
${second}

Score each answer 1-5 on each dimension:
${rubric}

Reply with only JSON, no prose: {"A":{"correctness":n,"attribution":n,"gaps":n,"calibration":n,"usability":n},"B":{...},"note":"one sentence on the sharpest difference"}`

  const result = spawnSync('claude', ['-p', prompt, '--output-format', 'json', '--max-turns', '1',
    '--model', JUDGE, '--setting-sources', '', '--strict-mcp-config', '--allowed-tools',
    '--no-session-persistence', '--max-budget-usd', '1.00'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  let outer
  try { outer = JSON.parse(result.stdout) } catch { return { failed: `judge output unparseable (exit ${result.status})` } }
  if (outer.is_error === true) return { failed: String(outer.result).slice(0, 120) }
  const body = String(outer.result ?? '')
  const match = /\{[\s\S]*\}/.exec(body)
  if (!match) return { failed: `no JSON in judge reply: ${body.slice(0, 120)}` }
  try { return { scores: JSON.parse(match[0]), cost: outer.total_cost_usd ?? 0 } } catch { return { failed: 'judge JSON invalid' } }
}

const weighted = row => RUBRIC.reduce((total, [name, weight]) => total + weight * (row?.[name] ?? 0), 0)

const unknown = ONLY.filter(name => !CASES.some(testCase => testCase.fixture === name))
if (unknown.length > 0) {
  console.error(`no such case: ${unknown.join(', ')}`)
  console.error(`available: ${CASES.map(testCase => testCase.fixture).join(', ')}`)
  process.exit(2)
}
const selected = ONLY.length > 0 ? CASES.filter(testCase => ONLY.includes(testCase.fixture)) : CASES

console.log(`receipts eval — agent=${AGENT} judge=${JUDGE} runs=${RUNS} cases=${selected.length}`)
console.log(`Both arms carry the plugin; the contrast is /ledger:receipts on against off.`)
console.log('='.repeat(74))

if (DRY) {
  for (const testCase of selected) {
    const dir = join(PACK, 'evals', 'triggers', testCase.fixture, 'fixture')
    console.log(`${existsSync(dir) ? 'ok  ' : 'MISSING '} ${testCase.fixture} — ${collectFixture(dir).length} file(s)`)
  }
  console.log(`\nWould make ${selected.length * RUNS * 2} generation calls and ${selected.length * RUNS} judgements.`)
  process.exit(0)
}

// The batch belongs in the name. A second invocation wrote over the first's
// captures for every case it shared, which is the third time in this repository
// that an arm- or batch-blind output path has destroyed the evidence for a
// number that had already been reported.
const batch = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '')
const outDir = join(PACK, 'evals', 'results', `receipts-${AGENT}-vs-${JUDGE}-${batch}`)
mkdirSync(outDir, { recursive: true })
const totals = { on: [], off: [] }
let spend = 0

for (const testCase of selected) {
  for (let run = 1; run <= RUNS; run += 1) {
    const on = generate(testCase, true)
    const off = generate(testCase, false)
    if (on.failed || off.failed) {
      console.log(`SKIP  ${testCase.fixture} run ${run} — ${on.failed ?? off.failed}`)
      continue
    }
    spend += (on.cost ?? 0) + (off.cost ?? 0)

    // Randomise which arm is presented first, so the judge cannot learn a slot.
    const onFirst = Math.random() < 0.5
    const verdict = judge(testCase, onFirst ? on.text : off.text, onFirst ? off.text : on.text)
    if (verdict.failed) { console.log(`SKIP  ${testCase.fixture} run ${run} — ${verdict.failed}`); continue }
    spend += verdict.cost ?? 0

    const onRow = onFirst ? verdict.scores.A : verdict.scores.B
    const offRow = onFirst ? verdict.scores.B : verdict.scores.A
    totals.on.push(onRow)
    totals.off.push(offRow)
    const strip = arm => ({ text: arm.text, cost: arm.cost, turns: arm.turns, tools: arm.tools, present: arm.present })
    writeFileSync(join(outDir, `${testCase.fixture}.run${run}.json`), JSON.stringify(
      { case: testCase.fixture, run, onFirst, on: { ...strip(on), scores: onRow }, off: { ...strip(off), scores: offRow }, note: verdict.scores.note }, null, 2))
    writeFileSync(join(outDir, `${testCase.fixture}.run${run}.on.jsonl`), on.stream)
    writeFileSync(join(outDir, `${testCase.fixture}.run${run}.off.jsonl`), off.stream)

    console.log(`${testCase.fixture} run ${run}: on ${weighted(onRow).toFixed(2)} vs off ${weighted(offRow).toFixed(2)}   ${verdict.scores.note ?? ''}`)
  }
}

console.log('='.repeat(74))
if (totals.on.length === 0) { console.log('no scored pairs'); process.exit(1) }
const mean = (rows, name) => rows.reduce((total, row) => total + (row?.[name] ?? 0), 0) / rows.length
console.log(`${'dimension'.padEnd(14)}${'weight'.padStart(7)}${'off'.padStart(8)}${'on'.padStart(8)}${'Δ'.padStart(8)}`)
for (const [name, weight] of RUBRIC) {
  const off = mean(totals.off, name)
  const on = mean(totals.on, name)
  console.log(`${name.padEnd(14)}${String(weight).padStart(7)}${off.toFixed(3).padStart(8)}${on.toFixed(3).padStart(8)}${(on - off >= 0 ? '+' : '') + (on - off).toFixed(3)}`)
}
const offW = totals.off.reduce((total, row) => total + weighted(row), 0) / totals.off.length
const onW = totals.on.reduce((total, row) => total + weighted(row), 0) / totals.on.length
console.log(`${'WEIGHTED'.padEnd(14)}${''.padStart(7)}${offW.toFixed(3).padStart(8)}${onW.toFixed(3).padStart(8)}${(onW - offW >= 0 ? '+' : '') + (onW - offW).toFixed(3)}`)

const wins = totals.on.filter((row, index) => weighted(row) > weighted(totals.off[index])).length
const losses = totals.on.filter((row, index) => weighted(row) < weighted(totals.off[index])).length
console.log(`\npairs ${totals.on.length}: receipts wins ${wins}, loses ${losses}, ties ${totals.on.length - wins - losses}`)
console.log(`captures: ${outDir}`)
console.log(`token pricing for this run: $${spend.toFixed(2)}`)
