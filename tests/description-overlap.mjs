#!/usr/bin/env node
// Free, offline analysis of trigger-vocabulary overlap between descriptions.
//
// It does NOT measure triggering. Whether a description causes the right skill
// to load is a decision a model makes, and nothing offline observes that — see
// tests/trigger-harness.mjs, which costs money because it has to.
//
// What this does instead is deterministic and free: find the pairs whose
// trigger vocabulary overlaps most, because those are the pairs a reader is
// most likely to confuse. And check one thing a measurement would take many
// runs to surface — whether each description's negative route points at the
// sibling it actually collides with, rather than at a different one.
//
// A report, not a gate: any overlap threshold would be an arbitrary number, and
// this pack does not ship arbitrary thresholds. Read it and judge.
//
// Run: node tests/description-overlap.mjs

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Words that carry no trigger signal: English function words, plus the
 * boilerplate every description in this pack shares. Leaving these in would
 * make every pair look similar for reasons that tell a reader nothing.
 */
const NOISE = new Set(`
a an and are as at be been before by do does for from has have in into is it its
of on or that the this to when where which who with you your not no non any also
use used using invoke invoked route routed reach reaching ledger skill skills
about after already another anything asked deciding decide decides other over
own same something state stated states than them then there these those
`.trim().split(/\s+/))

const terms = text => new Set(
  text.toLowerCase()
    .replace(/`[^`]*`/g, ' ')            // identifiers are not trigger vocabulary
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !NOISE.has(word)),
)

const jaccard = (a, b) => {
  const shared = [...a].filter(word => b.has(word))
  const union = new Set([...a, ...b])
  return { score: union.size === 0 ? 0 : shared.length / union.size, shared }
}

/**
 * Drop vocabulary that appears across many descriptions.
 *
 * Every description here opens with the same shape — "Use when writing,
 * changing, or reviewing ... that touches ..." — so words like `reviewing`,
 * `touches` and `files` are shared sentence template rather than shared
 * subject. Left in, they dominate the ranking and pair skills that have
 * nothing to do with each other. The first version of this tool did exactly
 * that, and its nearest-neighbour output was mostly noise.
 */
const TEMPLATE_FLOOR = 4
function stripTemplateVocabulary(all) {
  const frequency = new Map()
  for (const skill of all) {
    for (const word of skill.terms) frequency.set(word, (frequency.get(word) ?? 0) + 1)
  }
  const template = new Set([...frequency].filter(([, count]) => count >= TEMPLATE_FLOOR).map(([word]) => word))
  for (const skill of all) {
    skill.terms = new Set([...skill.terms].filter(word => !template.has(word)))
  }
  return template
}

const skills = readdirSync(join(ROOT, 'skills'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()
  .map(name => {
    const text = readFileSync(join(ROOT, 'skills', name, 'SKILL.md'), 'utf8')
    const description = (/^description:\s*(.*)$/m.exec(text) ?? [])[1] ?? ''
    // The trigger half is everything before the negative route; the route names
    // the sibling the author judged most confusable.
    const split = description.search(/DO NOT/)
    const trigger = split === -1 ? description : description.slice(0, split)
    const routes = [...description.matchAll(/ledger:([a-z0-9-]+)/g)].map(match => match[1])
    return { name, description, trigger, routes, terms: terms(trigger) }
  })

const template = stripTemplateVocabulary(skills)

console.log('description overlap — free, offline, and not a measurement')
console.log('='.repeat(72))
console.log('Overlap says which pairs a reader could confuse. It does not say whether')
console.log('either one triggers: that needs a model, and tests/trigger-harness.mjs.')
console.log('='.repeat(72))
console.log('')
console.log(`Ignored as shared sentence template (in ${TEMPLATE_FLOOR}+ of ${skills.length} descriptions):`)
console.log(`  ${[...template].sort().join(', ') || '(none)'}`)
console.log('')

const pairs = []
for (let i = 0; i < skills.length; i += 1) {
  for (let j = i + 1; j < skills.length; j += 1) {
    const { score, shared } = jaccard(skills[i].terms, skills[j].terms)
    pairs.push({ a: skills[i], b: skills[j], score, shared })
  }
}
pairs.sort((one, two) => two.score - one.score)

console.log('Most overlapping pairs')
console.log('')
for (const pair of pairs.slice(0, 8)) {
  const routed = pair.a.routes.includes(pair.b.name) || pair.b.routes.includes(pair.a.name)
  console.log(`  ${(pair.score * 100).toFixed(0).padStart(3)}%  ${pair.a.name} <-> ${pair.b.name}${routed ? '   [routed]' : '   [NOT routed]'}`)
  console.log(`        shared: ${pair.shared.slice(0, 10).join(', ')}`)
}

console.log('')
console.log('Does each negative route point at the sibling it actually collides with?')
console.log('')
let aimed = 0
let unrouted = 0
for (const skill of skills) {
  const ranked = pairs
    .filter(pair => pair.a.name === skill.name || pair.b.name === skill.name)
    .map(pair => ({ other: pair.a.name === skill.name ? pair.b.name : pair.a.name, score: pair.score }))
    .sort((one, two) => two.score - one.score)
  const nearest = ranked[0]

  if (skill.routes.length === 0) {
    unrouted += 1
    console.log(`  ${skill.name}`)
    console.log(`      no negative route; nearest is ${nearest.other} at ${(nearest.score * 100).toFixed(0)}%`)
    continue
  }
  const hit = skill.routes.includes(nearest.other)
  if (hit) aimed += 1
  else {
    const routedScore = ranked.find(entry => skill.routes.includes(entry.other))
    console.log(`  ${skill.name}`)
    console.log(`      routes away from ${skill.routes.join(', ')} (${routedScore ? (routedScore.score * 100).toFixed(0) + '%' : 'not ranked'})`)
    console.log(`      but its nearest neighbour is ${nearest.other} at ${(nearest.score * 100).toFixed(0)}%`)
  }
}

console.log('')
console.log(`${aimed} of ${skills.length} route at their nearest neighbour; ${unrouted} carry no route.`)
console.log('')
console.log('A route aimed elsewhere is not automatically wrong — the author may have')
console.log('judged a lower-overlap sibling the likelier confusion, and shared vocabulary')
console.log('is a proxy for confusability rather than the thing itself. Treat each line as')
console.log('a question to answer, not a defect to fix.')
