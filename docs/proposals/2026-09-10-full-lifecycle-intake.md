# Taking over the full lifecycle — intake

**Status:** proposed. No skill code written.
**Goal:** a Claude Code install that carries only `ledger` can run a change from
"someone asked for a thing" to "it landed and stays true", with no second pack.

## 0 — Value interrogation

**Who is blocked right now.** Anyone who installs this pack alone. The
seventeen shipped skills all govern work *inside* one already-decided change:
the router's own stage diagram starts at "Set up & scope". Nothing here decides
whether a change should exist, what it must satisfy, how it decomposes, where
each piece runs, or whether the delivered thing works in production shape.

**The current workaround and its cost.** Install a second pack for the front
half. Measured cost of that arrangement, observed in a real session on
2026-09-10:

- Two routers compete for the same `SessionStart` injection slot.
- The other pack's bootstrap carries a "1% chance a skill might apply ⇒ you
  ABSOLUTELY MUST invoke it" mandate. `refusing-busywork` is written against
  exactly that posture ("Each of those is a reflex standing in for a
  judgment"). The two are not phrasing variants; they are opposite stances, and
  the one with the stronger imperative wins by default.
- The overlap is real but partial: four disciplines are stated twice, and the
  duplicated pair `receiving-code-review` / `reviewing-as-cis-complement` state
  the same no-performative-agreement rule in two places that can drift apart.

**Named consumer.** The installer of this pack — and, one level down, the
reader of that installer's change six months later, which is the reader every
skill here is already written for.

**Minimum wedge.** Stage 0's front door alone. A single skill that classifies
how much process a request needs — and refuses the ceremony when it is not
earned — delivers value before any of the other five exist, because today the
pack has no answer at all for "should this be a change?" and `refusing-busywork`
has no vote on the front half.

## 1 — Reachability diagnosis

Verified against the shipped tree, not from memory.

| Lifecycle stage | Shipped coverage |
|---|---|
| Should this exist; who is blocked | none |
| Prior art; ≥2 candidate approaches; recorded reasons | none |
| Acceptance criteria in a testable form | none |
| Paper review of a design before code | none |
| Decomposition into independently testable units | none |
| Which loop each unit takes; where it runs; dependency waves | none |
| Context/cost budget for the loop itself | none |
| Orchestrator + fresh-worker execution; handoff contracts | none |
| The bounded loop itself: test-plan → implement → exit gate | none |
| False-guardrail morphology | partial — `proving-the-regression` has the negative control, not the taxonomy |
| Production-shape validation ("green ≠ works") | none |
| Recycling direction: re-verify, staleness, archive | partial — `curating-decision-records` covers records only |
| Scope, evidence, docs, review, landing discipline | **complete — this is the pack's current whole** |

## 2 — Prior art

Three implementations were read in full or in part on 2026-09-10, plus one
survey. Findings, with what each is good for and what it cannot give us.

**A large open-source methodology pack.** Owns the front half as process: a
three-path classifier (feasibility probe / bounded / architectural) with a hard
approval gate on every path; plan documents written for a reader with no
context, tasks sized at 2-5 minutes; an execution engine that dispatches a
fresh implementer per task, reviews each, runs a bounded fix loop with a
five-round breaker, and adjudicates the residue into a ruling ledger.

- **Worth taking:** the handoff mechanics — brief and diff handed over as
  *files*, so neither enters the controller's context; the ruling ledger, whose
  stated reason is that a decision dying in a scratch directory was made in
  secret; the breaker-then-adjudicate shape, which converts an unbounded loop
  into a bounded one with an honest residue.
- **Cannot take:** its ceremony is unconditional past the classifier, and it
  prices no decision. It also states no cost model, so its model-selection
  advice cannot be checked.

**An internal loop-engineering pack (read-only reference; not to be
modified).** Owns the front half *and* two things nobody else has: an
orchestration gate that decides per unit which loop it takes, whether units
merge or split, where each runs, and how dependency waves are ordered — with a
machine checker over the resulting table; and a recycling-direction loop for
knowledge already marked verified.

- **Worth taking:** the orchestration table, because it is the only
  machine-checkable plan form of the three; the cost model's *direction* (cost
  tracks replayed context, so cut context rather than cutting reviews); the
  measured self-review rate for review-type work, which is the evidence that a
  "delegate to a fresh reader" sentence without a lock is decoration; the
  recycling loop; the false-guardrail taxonomy.
- **Cannot take:** its measured thresholds. They are that pack's project
  values, and this pack's central rule forbids a project value in skill prose.
  It says so itself about its own numbers: do not budget from another project's
  figures.

**A vendor spec-driven toolkit.** Four phases, each emitting a markdown
artifact that feeds the next, plus a one-time "constitution" of non-negotiable
project principles.

- **Worth taking:** the constitution layer. This pack has a home for machine
  *values* (`.ledger.yml`) and no home for project *principles*.
- **Cannot take:** the phase structure is thinner than either pack above and
  prices nothing.

**Survey.** A process taxonomy of agent development frameworks confirms the
shape: every framework surveyed covers specify → plan → tasks → implement, and
none of them covers the recycling direction. That absence is where this pack
can be more than a translation.

## 3 — Candidate approaches

### The axis, measured first

`npm run analyze:descriptions` over the shipped seventeen, 2026-09-10: the
most overlapping pair is 10% (`refusing-busywork` / `writing-complete-propositions`),
every other pair is at or under 8%, and 3 of 17 route at their nearest
neighbour. **The shipped descriptions are highly separable, so "the pack
already has too many skills" is not supported.**

What the number does explain is why they are separable: **each shipped skill
owns one criterion**, not one stage. `what-counts-as-evidence` owns what a
signal proves. `proving-the-regression` owns whether a check can fail.
`scoping-a-change` owns how a base is resolved. `refusing-busywork` owns what
not to run.

An earlier draft of this proposal cut the front half by **stage** —
decompose, then route, then budget, then orchestrate. That is the wrong axis
for this pack, and it fails for a reason the overlap tool would have caught
after the fact: those four produce **one artifact** (the orchestration table)
and share one vocabulary (unit, plan, worker, context). Split four ways they
would negatively route at each other and compete for the same trigger surface,
which is the failure mode the 10% ceiling above shows the pack does not
currently have.

**So the front half is cut by criterion, and the count falls out of that
rather than being targeted.** Rule 5 applies to this proposal too: no quotas.

### The set

| Skill | The criterion it owns |
|---|---|
| `qualifying-a-request` | whether a request earns a change at all, and how much ceremony it earns |
| `specifying-acceptance` | whether an acceptance criterion is testable — whether one assertion can satisfy it |
| `planning-the-work` | whether an orchestration table is settled |
| `running-a-bounded-loop` | whether one unit of work is finished |
| `validating-real-scenarios` | which signal is the one a user would recognise |
| `metabolizing-knowledge` | when something already marked verified stops being true |

Two bodies of material fold in as reference files rather than skills, because
neither owns a criterion of its own and a reference file needs no eval case and
takes no trigger surface:

- **False-guardrail morphology** →
  `proving-the-regression/references/false-guardrail-forms.md`. It is the other
  half of a criterion that skill already owns: it says a check unseen failing is
  not a check, and this says what "cannot fail" looks like from outside.
- **Context economics and the worker brief templates** →
  `planning-the-work/references/`. The cost model is the method for filling one
  column of the table, not a separate judgement.

Prior-art survey folds into `qualifying-a-request` as a required product of it.
It is not a criterion: "verify rather than recall" is already owned by
`fact-checking-by-execution`.

### Batching

| | A · One batch of six | B · Front door only | C · Two batches |
|---|---|---|---|
| Scope | 6 skills + 6 eval cases + 3 reference files + router + svg + both READMEs | 1 skill | 4 then 2 |
| First value | after the whole batch | immediately | after batch 1 |
| Risk | six descriptions land on one trigger surface unmeasured | a request gets classified and then falls off a cliff | batch 1 is a usable spine; batch 2 lands on measured triggers |
| Blast radius if the design is wrong | whole batch reworked | one skill | batch 2 informed by batch 1's evals |

**Recommended: C.**

- Batch 1 — the spine after which this pack alone can carry one change end to
  end: `qualifying-a-request`, `specifying-acceptance`, `planning-the-work`,
  `running-a-bounded-loop`, plus the false-guardrail reference file hung on the
  already-shipped `proving-the-regression` (no new trigger surface).
  *Business-driven:* this is the smallest set that reaches the stated goal.
- Batch 2 — `validating-real-scenarios`, `metabolizing-knowledge`.
  *Technical-driven:* both need adapter keys, and those are cheaper to design
  once batch 1's trigger evals say which descriptions actually fire.

Rejected: A, on the same ground the axis section gives — landing every new
description at once leaves nothing to measure between them. Rejected: B,
because the goal is not a better front door, it is not needing a second pack.

## 4 — The binding constraints

Every one below was read out of the gate on 2026-09-10, with the line. These
are the reason the work is not "write six markdown files".

1. **No project-specific referent in skill prose.** `PROJECT_TOKENS`,
   `tests/drift-gate.mjs:52+`. This is what forbids porting the reference
   pack's measured thresholds verbatim. Numbers that vary by project go to
   `.ledger.yml`; the skill states the method for deriving them.
2. **No naming another pack, plugin, or product in any shipped file.**
   `CONTRIBUTING.md`, "Positioning here is by claim, never by contrast." So the
   ported skills carry no attribution in their prose. Attribution belongs in
   `NOTICE`.
3. **Description ≤ 500 characters, no angle brackets.** `DESCRIPTION_MAX`,
   `tests/drift-gate.mjs:47`. The reference pack's descriptions run many times
   that and cannot be copied.
4. **Descriptions carry triggers and negative routes only — never a workflow
   summary**, and each must name the sibling it is most likely to be confused
   with. `CONTRIBUTING.md`, "Writing a description". Six new skills means six
   new confusion pairs to name, and two of them are with each other —
   `qualifying-a-request` against `refusing-busywork` (same family, opposite
   direction: one allocates ceremony, the other refuses it), and
   `validating-real-scenarios` against `what-counts-as-evidence`.
5. **Frontmatter keys are an allowlist.** `ALLOWED_KEYS`,
   `tests/drift-gate.mjs:34`. Note `user-invocable` is hyphenated here; the
   underscore spelling used elsewhere would be rejected.
6. **The router must name every shipped skill and may name nothing else.**
   `checkRouter`, `tests/drift-gate.mjs:233`. `using-ledger` gets rewritten in
   the same change as each batch, not after.
7. **Every `ledger:name` cross-reference must resolve** —
   `checkCrossReferences`, `:261`, scanning `skills/` plus `README.md` only
   (`shippedMarkdown`, `:117`). Batch 1 therefore must not route to a batch 2
   skill.
8. **Every model-invocable skill needs an eval case asserting it loads.**
   `checkEvalCases`, `:428` — "no case asserts that X loads — its description
   has no evidence behind it". A negative grader does not count. A case needs
   `schema_version`, `runs` ≥ 3, at least one grader that is not `tool_used`,
   and a real fixture; a `regex` grader additionally needs positive and
   negative controls in `tests/grader-controls.mjs` (`:405`).
9. **`loop.svg` must name every shipped skill.** `CONTRIBUTING.md`, branding
   section. The stage diagram is redrawn per batch — and it currently has five
   stages, which no longer fits.
10. **Both READMEs' skill tables must list every shipped skill**, and the
    translation check holds them to the same top-level section count and
    byte-identical code blocks (`checkDocumentedSkillTables`, `:472`;
    `checkTranslationPairing`, `:521`).
11. **Any adapter key a skill reads must exist in the template at that path.**
    `checkAdapterKeys`, `:278`. Batch 2's cost and lock keys require the
    template to change first.
12. **Version agrees across three manifests.** `checkVersionAgreement`, `:445`.

`docs/proposals/` itself is outside every one of these scopes, which is why
this file may name unshipped skills freely.

## 5 — What one skill actually costs

Per model-invocable skill: a `SKILL.md`; a description under the cap carrying a
negative route; an eval case with a working fixture; grader controls if the case
uses a regex; a router entry; an svg entry; a row in each README; a
`plugin.json` entry. Plus, per batch: adapter template keys, a version bump
across three files, and a redrawn stage diagram.

**A reference file costs none of that** — no eval case, no router entry, no
trigger surface. That is why two bodies of material moved there in §3, and it
is the whole reason the batch is affordable: the false-guardrail morphology and
the context cost model are the two largest pieces of new content, and neither
adds a skill.

The honest estimate is therefore per batch, not per file. Batch 1 is four
skills, four fixtures, one reference file on an existing skill, and the U5
consistency unit.

## 6 — Acceptance

Stated so each line maps to one assertion.

- When a request arrives that is smaller than the adapter's trivial-change
  threshold, the pack shall classify it as such and shall not open an intake.
- When a request needs a new interface or changes an acceptance assertion, the
  pack shall require a recorded decision before implementation begins.
- When acceptance criteria are written, each shall name the observable response
  that satisfies it.
- When a guard is added, the pack shall require both a discriminating case and
  a mutation proving that case is what holds the guard.
- When a unit's work is complete, the pack shall report what ran, what was
  skipped, and why — which is the existing `receipts` contract, unchanged.

**e2e case.** One real change carried end to end on a machine with only this
pack installed, from request to landed commit, with the transcript kept.

**The assignment.** Before writing any skill: run `npm test` on this tree and
quote the output. A batch that cannot state its own baseline has no business
adding checks to it.

## 7 — Units

| Unit | Deliverable | depends_on |
|---|---|---|
| U1 | `qualifying-a-request` + eval case + fixture | [] |
| U2 | `specifying-acceptance` + eval case + fixture | [] |
| U3 | `proving-the-regression/references/false-guardrail-forms.md`, named by relative path from the existing `SKILL.md` | [] |
| U4 | `planning-the-work` + its reference files + eval case + fixture | [U1, U2] |
| U5 | `running-a-bounded-loop` + eval case + fixture | [U2, U3] |
| U6 | router rewrite + `loop.svg` + both READMEs + `plugin.json` + version bump | [U1..U5] |

U1, U2 and U3 have no dependencies and can run concurrently. U3 is the cheapest
and touches a shipped skill's resource list, so the gate's unreferenced-resource
check (`checkResources`, `tests/drift-gate.mjs:203`) is exercised early.

U6 is deliberately last and deliberately one unit: the gate fails until the
router, the diagram, both README tables and the manifest all agree with the
tree, so splitting it produces a red tree between commits.

Two questions to answer while U6 has the router open, both raised by the overlap
tool rather than by a defect: `curating-decision-records` and
`writing-complete-propositions` sit at 7% with their negative routes aimed
elsewhere, and so do `proving-the-regression` and `what-counts-as-evidence`.
Answering them is cheap while the router is being rewritten anyway. **Changing
either shipped pair is out of scope** — `CONTRIBUTING.md` requires eval evidence
for behaviour-shaping edits, which this batch does not carry.

Unchecked prose counts, found on 2026-09-10 and false the moment any skill
ships, in a pack whose thesis is that unchecked prose goes stale while every
automated check stays green:

| File | Text |
|---|---|
| `README.md:90`, `README.zh-CN.md:90` | "Behind it are sixteen skills" / "十六个 skill" |
| `README.md:116`, `README.zh-CN.md:116` | "These sit under all sixteen" / "全部十六个 skill" |
| `AGENTS.md:23` | "the map of the other sixteen skills" |
| `CONTRIBUTING.md:76` | "`loop.svg` names all sixteen skills" |

The gate checks the tables, the svg and the router, and not the numeral. U6
fixes all six occurrences; a check pinning the count against the tree — with a
planted defect, taking the advertised self-test count from 21 to 22 — is worth
its own unit and is not in this batch.

## 8 — Out of scope

- The reference pack is read-only. Nothing in it is edited, and it is not a
  dependency.
- No prescription of architecture, language, or toolchain. Unchanged.
- The always-on router hook decision is separate and still open.
- Measured thresholds are not ported. Where a skill needs one, it names the
  adapter key and the method for deriving it locally.
