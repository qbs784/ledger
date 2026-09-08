#!/usr/bin/env node
// seal-records — an append-only content seal for retired decision records.
//
// "We don't edit archived records" holds until someone does, and then nothing
// says which text changed. A hash manifest turns that convention into a check
// that fails.
//
// The ordering is the whole design: --write proves every existing seal still
// matches BEFORE it appends anything, and writes nothing when one does not. A
// tool that re-hashed the tree first would absorb a rewrite of a sealed record
// as new content — the exact event the manifest exists to catch.
//
// Verify: node seal-records.mjs <records-dir>
// Seal:   node seal-records.mjs <records-dir> --write
// Prove it can fail: node seal-records.mjs --self-test

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'

const HEX64 = /^[0-9a-f]{64}$/
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex')
/** A seal only means something when it names one file inside the tree it seals. */
const unusablePath = path => typeof path !== 'string' || path === '' || path.startsWith('/') || path.split('/').includes('..')

/**
 * The manifest lives beside the sealed directory, never inside it, so every file
 * in the tree is covered without exception. A manifest stored in its own subject
 * tree needs an exclusion rule, and an exclusion rule is a hole.
 */
const defaultManifestPath = dir => join(dirname(dir), `${basename(dir)}.seals.json`)

const usage = message => {
  console.error(`seal-records: ${message}

usage: seal-records.mjs <records-dir> [--write] [--init] [--manifest <path>]
       seal-records.mjs --self-test

The directory has no default. --write appends the unsealed records once every
existing seal verifies; --init creates the first manifest, which defaults to
<records-dir>.seals.json beside the tree.`)
  process.exit(2)
}

/**
 * Tree-relative POSIX paths of every regular file, sorted. Symlinks are refused
 * rather than followed: their bytes live outside the sealed tree, so a seal over
 * them keeps passing while the content a reader sees changes.
 */
function listTree(dir, problems) {
  const found = []
  const walk = current => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      const shown = relative(dir, path).split(sep).join('/')
      if (entry.isSymbolicLink()) problems.push(`${shown}: symlink inside a sealed tree; its bytes are not the sealed ones`)
      else if (entry.isDirectory()) walk(path)
      else if (entry.isFile()) found.push(shown)
      else problems.push(`${shown}: not a regular file, so it cannot be sealed`)
    }
  }
  walk(dir)
  return found.sort()
}

/**
 * Load the manifest, or refuse. A missing manifest is an error unless --write
 * --init says otherwise: creating one silently turns a mistyped --manifest path
 * into an empty manifest that seals nothing and reports success while the real
 * seals go unchecked. --init over an existing manifest is refused for the
 * inverse reason — that is how a whole tree gets re-sealed at once, absorbing
 * every edit in it.
 */
function loadManifest(path, options, problems) {
  const refuse = reason => void problems.push(`${path}: ${reason}`)
  if (!existsSync(path)) {
    if (options.write && options.init) return { version: 1, algorithm: 'sha256', entries: [] }
    return refuse('no manifest here. Pass --write --init to create one, or --manifest to name the real one.')
  }
  if (options.init) return refuse('already exists; --init will not re-seal a tree that is already sealed')
  let data
  try { data = JSON.parse(readFileSync(path, 'utf8')) } catch (error) { return refuse(`not valid JSON: ${error.message}`) }
  if (data?.algorithm !== 'sha256') return refuse(`algorithm ${JSON.stringify(data?.algorithm)} is not one this script can recompute`)
  if (!Array.isArray(data.entries)) return refuse('"entries" must be an array')
  return data
}

/** Recompute every seal. Returns the tree files no entry covers; everything else lands in `problems`. */
function verifySeals(dir, manifest, problems) {
  const present = new Set(listTree(dir, problems))
  const sealed = new Set()
  for (const [index, entry] of manifest.entries.entries()) {
    const path = entry?.path
    if (unusablePath(path)) { problems.push(`entry ${index}: path ${JSON.stringify(path)} must be relative to the sealed directory and stay inside it`); continue }
    if (!HEX64.test(entry.sha256 ?? '')) { problems.push(`${path}: sha256 is not 64 hex characters, so nothing here was ever sealed`); continue }
    if (sealed.has(path)) { problems.push(`${path}: sealed twice; the later entry can absorb a rewrite the earlier one catches`); continue }
    sealed.add(path)
    if (!present.has(path)) { problems.push(`${path}: sealed, but no longer in the tree`); continue }
    const actual = sha256(join(dir, path))
    if (actual !== entry.sha256) problems.push(`${path}: content changed since it was sealed (${entry.sha256.slice(0, 12)} -> ${actual.slice(0, 12)})`)
  }
  return [...present].filter(path => !sealed.has(path))
}

/** Verify, and under --write append the unsealed records only once verification is clean. */
function run(options) {
  const problems = []
  const dir = resolve(options.dir)
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return { problems: [`${dir}: not a directory`], appended: [], verified: 0 }
  const manifestPath = options.manifest === undefined ? defaultManifestPath(dir) : resolve(options.manifest)
  const manifest = loadManifest(manifestPath, options, problems)
  if (manifest === undefined) return { problems, appended: [], verified: 0, manifestPath }

  const unsealed = verifySeals(dir, manifest, problems)
  const verified = manifest.entries.length
  if (!options.write) {
    for (const path of unsealed) problems.push(`${path}: in the tree with no seal; add it with --write`)
    return { problems, appended: [], verified, manifestPath }
  }
  if (problems.length > 0) return { problems, appended: [], verified, manifestPath, refused: true }

  const sealedOn = new Date().toISOString().slice(0, 10)
  const appended = unsealed.map(path => ({ path, sha256: sha256(join(dir, path)), bytes: statSync(join(dir, path)).size, sealed: sealedOn }))
  if (appended.length > 0) {
    // Existing entries keep their order and their bytes: an append-only file
    // shows a pure addition in review, where a re-sorted one hides an edit.
    manifest.entries.push(...appended)
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  }
  return { problems, appended, verified, manifestPath }
}

/** A scratch tree with one record already sealed, built through this script's own write path. */
function seededTree() {
  const root = mkdtempSync(join(tmpdir(), 'ledger-seal-'))
  const dir = join(root, 'retired')
  mkdirSync(dir)
  writeFileSync(join(dir, '0001-first.md'), 'First decision. Archived 2026-01-02.\n')
  const { problems } = run({ dir, write: true, init: true })
  if (problems.length > 0) throw new Error(`self-test could not seed a tree: ${problems.join('; ')}`)
  return { root, dir, manifestPath: defaultManifestPath(dir) }
}

/** Rewrite a manifest in place, the way a careless hand or a bad merge would. */
const editManifest = (path, edit) => {
  const manifest = JSON.parse(readFileSync(path, 'utf8'))
  edit(manifest)
  writeFileSync(path, JSON.stringify(manifest, null, 2))
}

const VERB = { accept: 'accepts', reject: 'rejects', 'refuse-write': 'refuses to append beside' }

/**
 * One defect per case. `accept` is the control: a verifier that always failed
 * would pass every rejection below and be worthless. `refuse-write` is the
 * ordering claim itself — over a tree holding a rewritten seal and a genuinely
 * new record, --write must reject and leave the manifest byte-identical. Every
 * other case still passes if --write appends first.
 */
const CASES = [
  ['a clean tree', 'accept', () => {}],
  ['a sealed record rewritten in place', 'reject', tree => writeFileSync(join(tree.dir, '0001-first.md'), 'Quietly rewritten.\n')],
  ['a sealed record deleted from the tree', 'reject', tree => rmSync(join(tree.dir, '0001-first.md'))],
  ['a record present with no seal', 'reject', tree => writeFileSync(join(tree.dir, '0002-second.md'), 'Second decision.\n')],
  ['a record sealed twice', 'reject', tree => editManifest(tree.manifestPath, m => m.entries.push({ ...m.entries[0] }))],
  ['an entry pointing outside the tree', 'reject', tree => editManifest(tree.manifestPath, m => { m.entries[0].path = '../escape.md' })],
  ['a manifest that is not there', 'reject', tree => rmSync(tree.manifestPath)],
  ['a mismatched seal, leaving the manifest byte-identical', 'refuse-write', tree => {
    writeFileSync(join(tree.dir, '0001-first.md'), 'Quietly rewritten.\n')
    writeFileSync(join(tree.dir, '0002-second.md'), 'Second decision.\n')
  }],
]

function selfTest() {
  let passed = 0
  for (const [label, expected, plant] of CASES) {
    const tree = seededTree()
    try {
      plant(tree)
      const writing = expected === 'refuse-write'
      const before = writing ? readFileSync(tree.manifestPath, 'utf8') : undefined
      const { problems, appended } = run({ dir: tree.dir, write: writing })
      const unchanged = () => appended.length === 0 && readFileSync(tree.manifestPath, 'utf8') === before
      const held = expected === 'accept' ? problems.length === 0 : problems.length > 0 && (!writing || unchanged())
      console.log(`  ${held ? 'ok' : 'FAILED'}: ${VERB[expected]} ${label}`)
      if (held) passed += 1
    } finally {
      rmSync(tree.root, { recursive: true, force: true })
    }
  }
  console.log(`\nself-test: ${passed}/${CASES.length} cases held`)
  return passed === CASES.length
}

function parseArgs(argv) {
  const options = { dir: undefined, manifest: undefined, write: false, init: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--write') options.write = true
    else if (arg === '--init') options.init = true
    else if (arg === '--manifest') { index += 1; options.manifest = argv[index] ?? usage('--manifest needs a path') }
    else if (arg.startsWith('-')) usage(`unknown option ${arg}`)
    else if (options.dir === undefined) options.dir = arg
    else usage('expected exactly one records directory')
  }
  if (options.dir === undefined) usage('a records directory is required; this script guesses nothing')
  if (options.init && !options.write) usage('--init only applies with --write')
  return options
}

if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1)

const options = parseArgs(process.argv.slice(2))
const { problems, appended, verified, manifestPath, refused } = run(options)
if (problems.length > 0) {
  console.error(`seal-records: ${problems.length} problem(s)\n`)
  for (const problem of problems) console.error(`  ${problem}`)
  if (refused) console.error('\nwrote nothing: every existing seal must hold before any entry is appended')
  process.exit(1)
}
for (const entry of appended) console.log(`  sealed ${entry.path} ${entry.sha256.slice(0, 12)}`)
console.log(`seal-records: ${verified} seal(s) hold${options.write ? `, ${appended.length} newly sealed` : ''} (${manifestPath})`)
