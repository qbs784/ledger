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
 *
 * The two invocation keys are in because both target runtimes honour them and
 * one skill needs them: a router's description is a summary for a human
 * browsing commands, not trigger vocabulary for a model, so the model must not
 * be able to reach it.
 */
const ALLOWED_KEYS = new Set([
  'name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility',
  'disable-model-invocation', 'user-invocable',
])

/** A skill the model cannot invoke, per its own frontmatter. */
const isModelInvocable = skill => skill.data['disable-model-invocation'] !== 'true'

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
  // Every README that states the number, in any language.
  for (const file of ['README.md', 'README.zh-CN.md', 'docs/method.md']) {
    const path = join(root, file)
    if (!existsSync(path)) continue
    const text = readFileSync(path, 'utf8')
    const match = /(\d+)\s+(?:planted defects|个种植进去的缺陷)/.exec(text)
    if (match === null) {
      if (/planted defects|种植进去的缺陷/.test(text)) fail(file, 'mentions planted defects without a count the gate can check')
      continue
    }
    const advertised = Number(match[1])
    if (advertised !== plantedCount) {
      fail(file, `advertises ${advertised} planted defects; the self-test plants ${plantedCount}`)
    }
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
  const asserted = new Set()

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

    // Three floor invariants the official runner documents as non-negotiable.
    // The third is the one that voids a whole board: the runner excludes a
    // `tool_used: Skill` grader for the plugin under test from the score in both
    // arms, so a case graded only that way scores nothing at all — it looks
    // measured and is not. All fifteen cases here were in exactly that state
    // until it was checked.
    const graderTypes = [...text.matchAll(/^\s*-\s*type:\s*(\S+)/gm)].map(match => match[1].replace(/['"]/g, ''))
    if (graderTypes.length === 0) fail(file, 'has no graders')
    if (!graderTypes.some(type => type !== 'tool_used')) {
      fail(file, 'is graded only by tool_used, which the runner reports but excludes from the score — the case measures nothing')
    }
    const runs = /^runs:\s*(\d+)\s*$/m.exec(text)
    if (runs === null) fail(file, 'does not set runs')
    else if (Number(runs[1]) < 3) fail(file, `sets runs: ${runs[1]}; the runner's floor is 3, below which a single sample reads as a rate`)

    // A regex grader is the cheapest outcome check and the quietest to rot: a
    // pattern loosened while chasing one phrasing becomes always-pass, and the
    // board goes green. Every one is pinned from both sides.
    if (graderTypes.includes('regex')) {
      const controls = join(root, 'tests', 'grader-controls.mjs')
      // Names must be read per grader block: a `tool_used` grader's name is
      // not a regex grader's name, and pinning it would demand controls for a
      // pattern that does not exist.
      const named = text.split(/^\s*-\s*type:\s*/m).slice(1)
        .filter(block => /^regex\b/.test(block.trim()))
        .flatMap(block => [...block.matchAll(/^\s*name:\s*(.+)$/gm)].map(match => match[1].trim().replace(/^['"]|['"]$/g, '')))
      const controlText = existsSync(controls) ? readFileSync(controls, 'utf8') : ''
      if (!controlText.includes(`'${entry.name}'`)) {
        fail(file, `has a regex grader but tests/grader-controls.mjs has no controls for ${entry.name}`)
      } else {
        for (const graderName of named) {
          if (!/[a-z]/.test(graderName)) continue
          if (!controlText.includes(graderName)) {
            fail(file, `regex grader ${JSON.stringify(graderName)} has no positive/negative controls in tests/grader-controls.mjs`)
          }
        }
      }
    }

    for (const match of text.matchAll(/input_match:\s*(\S+)/g)) {
      asserted.add(match[1].replace(/['"]/g, ''))
      const named = match[1].replace(/['"]/g, '')
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(named) && !shipped.has(named)) {
        fail(file, `asserts on skill ${named}, which is not shipped`)
      }
    }
  }

  // A skill nobody measured is a description nobody has evidence for, which is
  // the claim this pack exists to make checkable. A negative grader asserting a
  // skill must NOT load does not count as coverage of that skill.
  //
  // Exempt the skills the model cannot invoke: a trigger case for one could
  // only ever fail, and requiring an impossible case would make the corpus
  // dishonest rather than complete.
  for (const skill of skills) {
    if (!isModelInvocable(skill)) continue
    if (!asserted.has(skill.dirName)) {
      fail(`evals/triggers`, `no case asserts that ${skill.dirName} loads — its description has no evidence behind it`)
    }
  }
}

/**
 * The version lives in three files. Nothing else notices when they drift, and a
 * marketplace entry disagreeing with plugin.json installs a version nobody
 * declared. Lived in CI-only YAML with no negative control until now.
 */
function checkVersionAgreement(root) {
  const read = file => {
    const path = join(root, file)
    if (!existsSync(path)) return undefined
    try {
      return JSON.parse(readFileSync(path, 'utf8'))
    } catch {
      fail(file, 'is not valid JSON')
      return undefined
    }
  }
  const plugin = read('.claude-plugin/plugin.json')?.version
  const market = read('.claude-plugin/marketplace.json')?.plugins?.[0]?.version
  const pkg = read('package.json')?.version
  const versions = [plugin, market, pkg].filter(version => version !== undefined)
  if (versions.length > 1 && new Set(versions).size !== 1) {
    fail('.claude-plugin/plugin.json', `version drift — plugin.json ${plugin}, marketplace.json ${market}, package.json ${pkg}`)
  }
}

/**
 * The README's skills table and the eval corpus table are twenty-two skill
 * names sitting in prose. The cross-reference check matches only the
 * `ledger:name` form, so a bare-backtick row naming a deleted skill, or a
 * shipped skill with no row, was invisible — which is the pack's own headline
 * failure mode inside its own front page.
 */
function checkDocumentedSkillTables(root, skills) {
  const shipped = new Set(skills.map(skill => skill.dirName))
  const tables = [
    ['README.md', /^\|\s*`([a-z0-9-]+)`\s*\|/gm],
    ['README.zh-CN.md', /^\|\s*`([a-z0-9-]+)`\s*\|/gm],
    // Backticks are required: an unquoted cell is prose (a result word, a note),
    // not a name to resolve.
    ['evals/README.md', /^\|\s*`([a-z0-9-]+)`\s*\|\s*`([a-z0-9-]+)`\s*\|(?:\s*`([a-z0-9-]+)`\s*\|)?/gm],
  ]

  for (const [file, pattern] of tables) {
    const path = join(root, file)
    if (!existsSync(path)) continue
    const text = readFileSync(path, 'utf8')
    const named = new Set()
    for (const match of text.matchAll(pattern)) {
      for (const cell of match.slice(1)) {
        if (cell !== undefined && cell !== '' && cell !== '—') named.add(cell)
      }
    }
    for (const name of named) {
      // A row's first cell may be an eval case name rather than a skill; only
      // hold names that look like skills but are not shipped.
      if (!shipped.has(name) && file.startsWith('README')) {
        fail(file, `its skills table names ${name}, which is not a shipped skill`)
      }
      if (!shipped.has(name) && file !== 'README.md' && !existsSync(join(root, 'evals', 'triggers', name))) {
        fail(file, `names ${name}, which is neither a shipped skill nor an eval case`)
      }
    }
    if (file.startsWith('README')) {
      for (const name of shipped) {
        if (!named.has(name)) fail(file, `its skills table omits the shipped skill ${name}`)
      }
    }
  }
}

/**
 * Hold the translated README against the English one.
 *
 * Splitting a bilingual README into two files buys a real reader a real
 * document and takes on a real risk: the copies drift, and nothing notices. A
 * check cannot tell whether a translation is faithful — but it can tell whether
 * a section went missing, whether the two stopped pointing at each other, and,
 * most importantly, whether a command was translated. A translated command is
 * a broken command, and it is the one kind of drift that silently breaks a
 * reader who followed the instructions.
 */
function checkTranslationPairing(root) {
  const english = join(root, 'README.md')
  const translated = join(root, 'README.zh-CN.md')
  if (!existsSync(english) || !existsSync(translated)) return

  const en = readFileSync(english, 'utf8')
  const zh = readFileSync(translated, 'utf8')

  const heads = text => text.split('\n').filter(line => /^##\s/.test(line)).length
  if (heads(en) !== heads(zh)) {
    fail('README.zh-CN.md', `has ${heads(zh)} top-level sections against the English README's ${heads(en)} — a section was added or dropped on one side`)
  }

  // Fenced blocks carry commands and configuration. They must survive
  // translation byte for byte, in the same order.
  const fences = text => [...text.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map(match => match[1])
  const enFences = fences(en)
  const zhFences = fences(zh)
  if (enFences.length !== zhFences.length) {
    fail('README.zh-CN.md', `has ${zhFences.length} code blocks against the English README's ${enFences.length}`)
  } else {
    enFences.forEach((block, index) => {
      if (block !== zhFences[index]) {
        fail('README.zh-CN.md', `code block ${index + 1} differs from the English README — a translated command is a broken command`)
      }
    })
  }

  // Each side must offer the reader the other, or one of them is unreachable.
  if (!en.includes('README.zh-CN.md')) fail('README.md', 'does not link the translated README, so nobody finds it')
  if (!zh.includes('README.md')) fail('README.zh-CN.md', 'does not link back to the English README')
}

/**
 * An asset nothing references is dead weight that nobody will notice going
 * stale — the same argument the pack makes about unreferenced skill resources,
 * applied to its own artwork.
 */
function checkAssetsReferenced(root) {
  const dir = join(root, 'assets')
  if (!existsSync(dir)) return
  const prose = ['README.md', 'README.zh-CN.md', 'CONTRIBUTING.md']
    .filter(file => existsSync(join(root, file)))
    .map(file => readFileSync(join(root, file), 'utf8'))
    .join('\n')
  for (const entry of readdirSync(dir)) {
    if (!prose.includes(`assets/${entry}`)) {
      fail(`assets/${entry}`, 'is referenced by no README or contributor document, so nothing will notice it going stale')
    }
  }
}

/**
 * The loop diagram is the only place a reader sees where a skill sits, and it is
 * hand-written SVG that nothing else reads. CONTRIBUTING claimed this check
 * existed before it did — the claim was true of intent and false of the tree,
 * which is the exact drift this gate is for.
 *
 * receipts is exempt: it is an output style that holds for a whole iteration
 * rather than a step inside one, so placing it in a numbered stage would be a
 * false claim. Every other shipped skill appears, and nothing appears that is
 * not shipped.
 */
const DIAGRAM_EXEMPT = new Set(['receipts'])

function checkLoopDiagram(root, skills) {
  const path = join(root, 'assets', 'loop.svg')
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf8')
  // Only the monospace skill labels count. Reading every token would match CSS
  // property names and hyphenated prose in the comment.
  const named = new Set([...text.matchAll(/class="sk"[^>]*>([^<]+)</g)].map(match => match[1].trim()))
  const shipped = new Set(skills.map(skill => skill.dirName))

  for (const name of named) {
    if (!shipped.has(name)) fail('assets/loop.svg', `names ${name}, which is not a shipped skill — a diagram that names a stale skill is a diagram that lies`)
  }
  for (const skill of skills) {
    if (DIAGRAM_EXEMPT.has(skill.dirName)) continue
    if (!named.has(skill.dirName)) fail('assets/loop.svg', `omits the shipped skill ${skill.dirName}, so a reader cannot see where it sits`)
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
  checkVersionAgreement(root)
  checkDocumentedSkillTables(root, skills)
  checkTranslationPairing(root)
  checkAssetsReferenced(root)
  checkLoopDiagram(root, skills)
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
    ['a shipped skill with no eval case asserting it', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      const caseDir = join(scratch, 'evals', 'triggers', 'other-case')
      mkdirSync(caseDir, { recursive: true })
      writeFileSync(join(caseDir, 'case.yaml'), 'schema_version: "1.0"\nname: other-case\ngraders:\n  - type: tool_used\n    input_match: not-the-demo-skill\n')
    }],
    ['version drift across the three manifests', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      writeFileSync(join(scratch, 'package.json'), JSON.stringify({ name: 'ledger', version: '9.9.9' }, null, 2))
      writeFileSync(join(scratch, '.claude-plugin', 'marketplace.json'), JSON.stringify({ name: 'ledger', plugins: [{ name: 'ledger', version: '0.1.0' }] }, null, 2))
    }],
    ['an asset nothing references', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      mkdirSync(join(scratch, 'assets'), { recursive: true })
      writeFileSync(join(scratch, 'assets', 'orphan.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    }],
    ['a translated command that drifted from the English one', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      writeFileSync(join(scratch, 'README.md'), '## One\n\n```sh\nnpm test\n```\n\nSee README.zh-CN.md\n')
      writeFileSync(join(scratch, 'README.zh-CN.md'), '## \u4e00\n\n```sh\nnpm \u6d4b\u8bd5\n```\n\nSee README.md\n')
    }],
    ['a translated README missing a section', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      writeFileSync(join(scratch, 'README.md'), '## One\n\ntext\n\n## Two\n\ntext\n\nSee README.zh-CN.md\n')
      writeFileSync(join(scratch, 'README.zh-CN.md'), '## \u4e00\n\ntext\n\nSee README.md\n')
    }],
    ['README skills table omitting a shipped skill', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      writeFileSync(join(scratch, 'README.md'), '| Skill | When |\n|---|---|\n| `nothing-here` | never |\n')
    }],
    ['loop diagram omitting a shipped skill', (skill, scratch) => {
      writeFileSync(skill, frontmatter('demo') + '\nBody.\n')
      mkdirSync(join(scratch, 'assets'), { recursive: true })
      // Referenced by a README whose skills table is complete, so the asset and
      // table checks stay quiet and only the diagram check can reject this.
      writeFileSync(join(scratch, 'assets', 'loop.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><text class="sk">not-a-shipped-skill</text></svg>')
      writeFileSync(join(scratch, 'README.md'), '| Skill | When |\n|---|---|\n| `demo` | never |\n\n![diagram](assets/loop.svg)\n')
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
      // Artifacts a one-skill scratch legitimately lacks. Filtering them is what
      // makes a case prove its own check: without this, every planted defect was
      // also 'rejected' by the missing adapter template, so a case whose check
      // was broken would still have passed.
      const NOISE = ['the router is missing', 'it is the adapter schema every other skill reads against']
      const relevant = found.filter(entry => !NOISE.some(noise => entry.includes(noise)))
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
