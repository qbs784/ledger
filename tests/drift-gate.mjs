#!/usr/bin/env node
// The drift gate: the pack's central check.
//
// A skill goes stale by naming a value that later moves. Two skills in the
// upstream corpus died exactly that way while every automated check stayed
// green, so this gate pins the ABSENCE of the values that must never appear.
// It also holds the router honest and keeps descriptions inside this pack's own
// length cap. Where a check states a limit, the comment says whose limit it is:
// several of these are house standards stricter than the shipped tooling, which
// was established by planting defects and watching the tooling accept them.
//
// Run: node tests/drift-gate.mjs
// Prove it can fail: node tests/drift-gate.mjs --self-test

import { readdirSync, readFileSync, existsSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROUTER = 'using-ledger'

/**
 * Frontmatter keys this pack allows. NOT what the shipped validator enforces:
 * `claude plugin validate --strict` accepts unknown keys (verified by planting
 * `version:` and `foo:`), so this is ledger's own house standard, kept narrow
 * so a skill stays loadable by any runtime that reads only name + description.
 */
const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility'])

/**
 * House cap on description length. This is NOT the shipped validator's limit —
 * it accepts 2000 characters (verified by planting one). 500 is the tightest
 * catalog truncation observed in a target runtime's source, so writing under it
 * keeps a description whole everywhere rather than only where the cap is loose.
 */
const DESCRIPTION_MAX = 500

/**
 * Project-specific referents that must never reach skill prose. A discipline
 * belongs in SKILL.md; the command that implements it belongs in the project
 * adapter. Scoped to skills/ — README and LICENSE legitimately name the
 * upstream project for attribution.
 */
const PROJECT_TOKENS = [
  [/\bpnpm\b/i, 'names a package manager; the adapter owns commands'],
  [/(^|[^a-z])dsh([^a-z]|$)/i, 'names the upstream product'],
  [/deepseek[- ]harness/i, 'names the upstream repository'],
  [/\bcordis\b/i, 'names the upstream framework'],
  [/\bvitest\b/i, 'names one test runner; say "the test runner"'],
  [/\.zh\.md\b/, 'assumes a bilingual documentation corpus'],
  [/\bgh stack\b/i, 'assumes one platform feature'],
  [/\.\/invariant\b/, 'names an upstream package convention'],
  [/\bpackages\/[^/\s)]+\/[^/\s)]+\//, 'hardcodes a monorepo layout'],
  [/\bAGENTS\.md\b/, 'names an upstream instruction file'],
  [/\bdoc-sync\b/, 'names an upstream gate'],
  [/\btest:(coverage|snapshot|expected|e2e)\b/, 'names an upstream test lane'],
  [/\borigin\/master\b/, 'hardcodes a default branch; the adapter owns it'],
]

/**
 * Other skill packs, plugins, and products. Positioning is by claim, never by
 * contrast, and this gate keeps that rule alive past edits by anyone who did
 * not read the plan. Applies to every shipped file.
 */
const PACK_NAMES = [
  /\bsuperpowers\b/i,
  /\bmattpocock\b/i,
  /\bask-matt\b/i,
  /\bkarpathy\b/i,
  /\bofficecli\b/i,
  /\bdrawio\b/i,
  /\b365-skills\b/i,
  /\bskill-creator\b/i,
]

const failures = []
const fail = (file, message) => failures.push(`${file}: ${message}`)

/** Parse the leading YAML frontmatter block as flat key/value pairs; nested YAML is not accepted. */
function parseFrontmatter(text) {
  const lines = text.split('\n')
  if (lines[0]?.trimEnd() !== '---') return { error: 'must start with a --- frontmatter fence' }
  const end = lines.indexOf('---', 1)
  if (end === -1) return { error: 'frontmatter fence is never closed' }
  const data = {}
  for (const line of lines.slice(1, end)) {
    if (line.trim() === '') continue
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!match) return { error: `frontmatter line is not a flat key: value pair: ${JSON.stringify(line)}` }
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    data[match[1]] = value
  }
  return { data, body: lines.slice(end + 1).join('\n') }
}

/**
 * Every shipped text file under skills/, plus the README. Deliberately not just
 * `.md`: a project referent hidden in a bundled .yml, .sh, or .py example is
 * exactly as stale-able as one in prose, and was previously never scanned.
 */
const TEXT_SUFFIXES = ['.md', '.yml', '.yaml', '.sh', '.py', '.json', '.txt']
function shippedMarkdown(root) {
  const out = []
  const walk = dir => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (TEXT_SUFFIXES.some(suffix => entry.name.endsWith(suffix))) out.push(path)
    }
  }
  walk(join(root, 'skills'))
  if (existsSync(join(root, 'README.md'))) out.push(join(root, 'README.md'))
  return out
}

function checkPackNames(root) {
  for (const file of shippedMarkdown(root)) {
    const text = readFileSync(file, 'utf8')
    for (const pattern of PACK_NAMES) {
      const hit = pattern.exec(text)
      if (hit) fail(relative(root, file), `names another pack or product (${JSON.stringify(hit[0])}) — position by claim, not contrast`)
    }
  }
}

function checkProjectTokens(root) {
  for (const file of shippedMarkdown(root)) {
    if (!relative(root, file).startsWith('skills/')) continue
    const text = readFileSync(file, 'utf8')
    text.split('\n').forEach((line, index) => {
      for (const [pattern, reason] of PROJECT_TOKENS) {
        const hit = pattern.exec(line)
        if (hit) fail(`${relative(root, file)}:${index + 1}`, `project referent ${JSON.stringify(hit[0].trim())} — ${reason}`)
      }
    })
  }
}

function readSkills(root) {
  const dir = join(root, 'skills')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .map(name => {
      const skillPath = join(dir, name, 'SKILL.md')
      if (!existsSync(skillPath)) {
        fail(`skills/${name}`, 'directory has no SKILL.md — discovery is one level deep, so this ships nothing')
        return undefined
      }
      const parsed = parseFrontmatter(readFileSync(skillPath, 'utf8'))
      if (parsed.error) {
        fail(`skills/${name}/SKILL.md`, parsed.error)
        return undefined
      }
      return { dirName: name, path: skillPath, ...parsed }
    })
    .filter(Boolean)
}

function checkFrontmatter(root, skills) {
  for (const skill of skills) {
    const file = relative(root, skill.path)
    const { name, description } = skill.data

    for (const key of Object.keys(skill.data)) {
      if (!ALLOWED_KEYS.has(key)) fail(file, `frontmatter key ${JSON.stringify(key)} is outside this pack's allowed set`)
    }

    if (!name) fail(file, 'frontmatter has no name')
    else {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) fail(file, `name ${JSON.stringify(name)} must be lowercase alphanumerics with single internal hyphens`)
      if (name.length > 64) fail(file, `name is ${name.length} chars; the limit is 64`)
      if (name !== skill.dirName) fail(file, `name ${JSON.stringify(name)} does not match its directory ${JSON.stringify(skill.dirName)} — the registered name comes from frontmatter, so they must agree`)
    }

    if (!description) fail(file, 'frontmatter has no description — it is the entire trigger surface')
    else {
      if (description.length > DESCRIPTION_MAX) fail(file, `description is ${description.length} chars; this pack caps them at ${DESCRIPTION_MAX} so no catalog truncates them`)
      if (/[<>]/.test(description)) fail(file, 'description contains < or >, which some packaging tools reject and which reads as markup in a catalog')
    }
  }
}

/** Resources are surfaced as a base path only, so a file the SKILL.md never names is invisible to the model. */
function checkResources(root, skills) {
  for (const skill of skills) {
    const dir = dirname(skill.path)
    const file = relative(root, skill.path)
    const body = skill.body

    const resources = []
    const walk = current => {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const path = join(current, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (path !== skill.path) resources.push(relative(dir, path))
      }
    }
    walk(dir)

    for (const resource of resources) {
      if (!body.includes(resource)) fail(file, `ships ${resource} but never names it by relative path — the model is given a base directory, not a listing, so this file is unreachable`)
    }

    for (const match of body.matchAll(/\[[^\]]*\]\(([^)#\s]+)(?:#[^)\s]*)?\)/g)) {
      const target = match[1]
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue
      // `<...>` marks a placeholder in a syntax example, not a path to resolve.
      if (target.includes('<') || target.includes('>')) continue
      if (!existsSync(resolve(dir, target))) fail(file, `dead relative link: ${target}`)
    }
  }
}

function checkRouter(root, skills) {
  const router = skills.find(skill => skill.dirName === ROUTER)
  if (!router) {
    if (skills.length > 0) fail(`skills/${ROUTER}/SKILL.md`, 'the router is missing; a pack without one leaves every skill to its description alone')
    return
  }
  const body = router.body
  const file = relative(root, router.path)

  for (const skill of skills) {
    if (skill.dirName === ROUTER) continue
    if (!body.includes(skill.dirName)) fail(file, `does not mention the shipped skill ${skill.dirName} — a router that omits a skill is a router that lies`)
  }

  const shipped = new Set(skills.map(skill => skill.dirName))
  for (const match of body.matchAll(/`(?:ledger:)?([a-z0-9]+(?:-[a-z0-9]+)+)`/g)) {
    const named = match[1]
    if (!shipped.has(named) && !named.startsWith('--')) {
      fail(file, `routes to ${named}, which is not a shipped skill — a router that names a stale skill is a router that lies`)
    }
  }
}

/**
 * A `ledger:name` reference is a routing promise. Skills route to each other in
 * prose rather than by relative link, so nothing but this check stops a
 * reference from outliving the skill it names.
 */
function checkCrossReferences(root, skills) {
  const shipped = new Set(skills.map(skill => skill.dirName))
  for (const file of shippedMarkdown(root)) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(/ledger:([a-z0-9]+(?:-[a-z0-9]+)*)/g)) {
      if (!shipped.has(match[1])) {
        fail(relative(root, file), `routes to ledger:${match[1]}, which is not a shipped skill`)
      }
    }
  }
}

/**
 * A skill that reads an adapter key it does not have is the exact failure the
 * adapter exists to prevent, moved one level up. The bootstrap template is the
 * schema, so every key a skill names must appear in it.
 */
function checkAdapterKeys(root, skills) {
  const templatePath = join(root, 'skills', 'adapting-to-a-project', 'references', 'adapter-template.yml')
  if (!existsSync(templatePath)) {
    fail('skills/adapting-to-a-project/references/adapter-template.yml', 'missing; it is the adapter schema every other skill reads against')
    return
  }
  // Collect the template's full dotted paths, tracking indentation. Matching a
  // bare name at any depth would accept `build` for what is really
  // `commands.build`, and a skill that cites the wrong path sends the reader
  // looking for a key that is not there.
  const declared = new Set()
  const stack = []
  for (const line of readFileSync(templatePath, 'utf8').split('\n')) {
    const match = /^(\s*)([a-z_]+):/.exec(line)
    if (!match) continue
    const depth = match[1].length
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop()
    stack.push({ depth, name: match[2] })
    declared.add(stack.map(entry => entry.name).join('.'))
  }

  for (const skill of skills) {
    // Keys are cited as `key` or `parent.key` in a sentence naming the adapter.
    for (const line of skill.body.split('\n')) {
      if (!line.includes('.ledger.yml')) continue
      for (const match of line.matchAll(/`([a-z_]+(?:\.[a-z_]+)*)`/g)) {
        const path = match[1]
        if (!declared.has(path)) {
          const nested = [...declared].find(entry => entry.endsWith(`.${path}`))
          const hint = nested === undefined ? 'the adapter template does not declare it' : `the template declares it as \`${nested}\``
          fail(relative(root, skill.path), `reads adapter key \`${path}\`, but ${hint}`)
        }
      }
    }
  }
}

/**
 * The README states how many defects the self-test plants. That is a machine
 * value living in prose, which is the exact failure this pack exists to catch —
 * and it had already drifted once, advertising eight when the suite planted
 * eleven. Rather than fix the word, read it.
 */
function checkAdvertisedDefectCount(root, plantedCount) {
  const readmePath = join(root, 'README.md')
  if (!existsSync(readmePath)) return
  const readme = readFileSync(readmePath, 'utf8')
  const match = /(\d+)\s+planted defects/.exec(readme)
  if (match === null) {
    if (readme.includes('planted defects')) fail('README.md', 'mentions planted defects without a count the gate can check')
    return
  }
  const advertised = Number(match[1])
  if (advertised !== plantedCount) {
    fail('README.md', `advertises ${advertised} planted defects; the self-test plants ${plantedCount}`)
  }
}

/**
 * Eval cases are the one part of the tree nothing else reads, and they cannot be
 * executed here — `plugin eval` is gated. So check what is checkable without the
 * runner: the fields whose absence or misspelling makes a case silently useless.
 * Every defect listed here was actually present when the cases were first written.
 */
function checkEvalCases(root, skills) {
  const dir = join(root, 'evals', 'triggers')
  if (!existsSync(dir)) return
  const shipped = new Set(skills.map(skill => skill.dirName))
  const ARM_VALUES = new Set(['with-only', 'both'])

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const casePath = join(dir, entry.name, 'case.yaml')
    const file = relative(root, casePath)
    if (!existsSync(casePath)) {
      fail(`evals/triggers/${entry.name}`, 'has no case.yaml, so the runner ignores it')
      continue
    }
    const text = readFileSync(casePath, 'utf8')

    if (!/^schema_version:/m.test(text)) fail(file, 'has no schema_version; the runner rejects the file before validating it')

    for (const match of text.matchAll(/^\s*arm:\s*(\S+)\s*$/gm)) {
      const value = match[1].replace(/['"]/g, '')
      if (!ARM_VALUES.has(value)) fail(file, `arm: ${value} is not one of ${[...ARM_VALUES].join(', ')}`)
    }

    // A grader with max: 0 and no min leaves an unsatisfiable range, and it
    // parses green — the worst combination, since it looks like coverage.
    for (const grader of text.split(/^\s*- type:/m).slice(1)) {
      if (/^\s*max:\s*0\s*$/m.test(grader) && !/^\s*min:\s*/m.test(grader)) {
        fail(file, 'a grader sets max: 0 without an explicit min, leaving an unsatisfiable range that still parses')
      }
    }

    for (const match of text.matchAll(/input_match:\s*(\S+)/g)) {
      const named = match[1].replace(/['"]/g, '')
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(named) && !shipped.has(named)) {
        fail(file, `asserts on skill ${named}, which is not shipped`)
      }
    }
  }
}

function checkManifest(root, skills) {
  const manifestPath = join(root, '.claude-plugin', 'plugin.json')
  if (!existsSync(manifestPath)) {
    fail('.claude-plugin/plugin.json', 'missing; the manifest must live at exactly this path')
    return
  }
  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    fail('.claude-plugin/plugin.json', `is not valid JSON: ${error.message}`)
    return
  }
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(manifest.name ?? '')) {
    fail('.claude-plugin/plugin.json', `name ${JSON.stringify(manifest.name)} does not match the required pattern`)
  }
  const declared = manifest.skills ?? []
  for (const entry of declared) {
    if (!entry.startsWith('./')) fail('.claude-plugin/plugin.json', `skills entry ${entry} must be relative and start with ./`)
    if (!existsSync(resolve(root, entry))) fail('.claude-plugin/plugin.json', `skills entry ${entry} does not exist`)
  }
  const declaredNames = new Set(declared.map(entry => entry.replace(/^\.\/skills\//, '')))
  for (const skill of skills) {
    if (!declaredNames.has(skill.dirName)) {
      fail('.claude-plugin/plugin.json', `skills/${skill.dirName} exists but is not listed in the skills array, so it does not ship`)
    }
  }
}

/** A README inside a scan root is parsed as a skill candidate, so it must stay at the repo root. */
function checkLayout(root) {
  const strayReadme = join(root, 'skills', 'README.md')
  if (existsSync(strayReadme)) {
    fail('skills/README.md', 'every direct *.md at a scan root is parsed as a skill candidate; keep the README at the repo root')
  }
  const nested = join(root, 'skills')
  if (existsSync(nested)) {
    for (const entry of readdirSync(nested, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) fail(`skills/${entry.name}`, 'is a symlink; plugin trees are copied into a cache and symlinks are dropped, so the skill would arrive empty')
      if (!entry.isDirectory()) continue
      for (const child of readdirSync(join(nested, entry.name), { withFileTypes: true })) {
        if (child.isDirectory() && existsSync(join(nested, entry.name, child.name, 'SKILL.md'))) {
          fail(`skills/${entry.name}/${child.name}/SKILL.md`, 'nested SKILL.md files are not discovered')
        }
      }
    }
  }
}

function run(root) {
  failures.length = 0
  const skills = readSkills(root)
  checkLayout(root)
  checkFrontmatter(root, skills)
  checkResources(root, skills)
  checkProjectTokens(root)
  checkPackNames(root)
  checkCrossReferences(root, skills)
  checkAdapterKeys(root, skills)
  checkRouter(root, skills)
  checkManifest(root, skills)
  checkEvalCases(root, skills)
  checkAdvertisedDefectCount(root, plantedCases().length)
  return { skills, failures: [...failures] }
}

/**
 * A gate not shown to fail is not a gate. Each case plants exactly one defect
 * in a scratch copy and asserts the gate rejects it.
 */
function plantedCases() {
  return [
    ['project referent in prose', skill => writeFileSync(skill, frontmatter('demo') + '\nRun `pnpm run test:coverage` first.\n')],
    ['outside pack named', skill => writeFileSync(skill, frontmatter('demo') + '\nUnlike superpowers, this pack is different.\n')],
    ['over-long description', skill => writeFileSync(skill, frontmatter('demo', 'x'.repeat(DESCRIPTION_MAX + 1)) + '\nBody.\n')],
    ['angle bracket in description', skill => writeFileSync(skill, frontmatter('demo', 'Use when <thing> happens') + '\nBody.\n')],
    ['unrecognized frontmatter key', skill => writeFileSync(skill, '---\nname: demo\ndescription: Use when demonstrating.\nversion: 1.0.0\n---\n\nBody.\n')],
    ['name disagrees with directory', skill => writeFileSync(skill, frontmatter('other') + '\nBody.\n')],
    ['unreferenced resource file', skill => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      mkdirSync(join(dirname(skill), 'references'), { recursive: true })
      writeFileSync(join(dirname(skill), 'references', 'orphan.md'), '# Orphan\n')
    }],
    ['dead relative link', skill => writeFileSync(skill, frontmatter('demo') + '\nSee [the ladder](references/missing.md).\n')],
    ['route to a skill that is not shipped', skill => writeFileSync(skill, frontmatter('demo') + '\nRoute that to ledger:no-such-skill.\n')],
    ['adapter key the template does not declare', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nRead `nonexistent_key` from `.ledger.yml`.\n')
      const templateDir = join(scratch, 'skills', 'adapting-to-a-project', 'references')
      mkdirSync(templateDir, { recursive: true })
      writeFileSync(join(templateDir, 'adapter-template.yml'), 'default_branch: null\ncommands:\n  focused_test: null\n')
      writeFileSync(join(scratch, 'skills', 'adapting-to-a-project', 'SKILL.md'), frontmatter('adapting-to-a-project') + '\nSee references/adapter-template.yml.\n')
    }],
    ['README advertising the wrong defect count', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      writeFileSync(join(scratch, 'README.md'), 'Run the self-test to watch it reject 999 planted defects.\n')
    }],
    ['eval case missing schema_version', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      const caseDir = join(scratch, 'evals', 'triggers', 'demo-case')
      mkdirSync(caseDir, { recursive: true })
      writeFileSync(join(caseDir, 'case.yaml'), 'name: demo-case\ngraders: []\n')
    }],
    ['eval grader with an illegal arm value', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      const caseDir = join(scratch, 'evals', 'triggers', 'demo-case')
      mkdirSync(caseDir, { recursive: true })
      writeFileSync(join(caseDir, 'case.yaml'), 'schema_version: "1.0"\nname: demo-case\ngraders:\n  - type: tool_used\n    arm: with_only\n')
    }],
    ['project referent hidden in a bundled yaml example', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nSee references/sample.yml.\n')
      mkdirSync(join(dirname(skill), 'references'), { recursive: true })
      writeFileSync(join(dirname(skill), 'references', 'sample.yml'), 'command: pnpm run test:coverage\n')
    }],
    ['router that omits a shipped skill', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      mkdirSync(join(scratch, 'skills', ROUTER), { recursive: true })
      writeFileSync(join(scratch, 'skills', ROUTER, 'SKILL.md'), frontmatter(ROUTER) + '\nThis router names nothing at all.\n')
    }],
  ]
}

function selfTest() {
  const cases = plantedCases()
  let passed = 0
  for (const [label, plant] of cases) {
    const scratch = mkdtempSync(join(tmpdir(), 'ledger-drift-'))
    try {
      mkdirSync(join(scratch, 'skills', 'demo'), { recursive: true })
      mkdirSync(join(scratch, '.claude-plugin'), { recursive: true })
      plant(join(scratch, 'skills', 'demo', 'SKILL.md'), scratch)
      const present = readdirSync(join(scratch, 'skills'), { withFileTypes: true })
        .filter(entry => entry.isDirectory()).map(entry => `./skills/${entry.name}`)
      writeFileSync(join(scratch, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'ledger', skills: present }, null, 2))
      const { failures: found } = run(scratch)
      const relevant = found.filter(entry => !entry.includes('the router is missing'))
      if (relevant.length === 0) {
        console.error(`  self-test FAILED: the gate accepted a planted defect (${label})`)
      } else {
        passed += 1
        console.log(`  rejects ${label}`)
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  }
  console.log(`\nself-test: ${passed}/${cases.length} planted defects rejected`)
  return passed === cases.length
}

const frontmatter = (name, description = 'Use when demonstrating the gate.') =>
  `---\nname: ${name}\ndescription: ${description}\n---\n`

if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1)
}

const { skills, failures: found } = run(ROOT)
if (found.length > 0) {
  console.error(`drift gate: ${found.length} failure(s)\n`)
  for (const entry of found) console.error(`  ${entry}`)
  process.exit(1)
}
console.log(`drift gate: clean (${skills.length} skill${skills.length === 1 ? '' : 's'})`)
