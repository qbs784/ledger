# Trigger evals

A skill in a plugin has no always-loaded instruction file behind it. Its `description` is the entire trigger surface, which makes description quality a measurable property rather than a matter of taste — and the failure mode is under-triggering, silently, on exactly the tasks the skill was written for.

These cases measure that. But triggering is not the goal — a skill that loads and then produces the wrong answer has failed, and a corpus that grades only the route cannot tell the two apart. So each case pairs a realistic prompt with a **fixture** giving the model something real to work on, an **outcome grader** asserting what the answer must contain, and a route grader recording which skill loaded.

There is one case per **model-invocable** skill — the drift gate fails if such a skill has no case asserting it loads, because a description nobody measured is a claim with no evidence behind it. The router is exempt and has no case: it carries `disable-model-invocation: true`, so a trigger case for it could only ever fail, and requiring an impossible case would make this corpus dishonest rather than complete.

| Case | Primary: outcome grader | Route (display only) | Must not load | Fixture |
|---|---|---|---|---|
| `adapter-bootstrap` | writes the adapter file *(file_exists)* | `adapting-to-a-project` | — | files |
| `adding-a-validator` | requires the check to be seen rejecting *(regex)* | `proving-the-regression` | — | files |
| `change-narration-cleanup` | names the narration rather than only tidying prose *(regex)* | `trimming-session-vantage` | — | files |
| `claiming-done` | refuses coverage and green CI as evidence of done *(regex)*, plus an `llm` rubric that only the official runner can score | `what-counts-as-evidence` | — | files |
| `deleting-an-unused-option` | finds the indirect reader before agreeing to delete *(regex)* | `proving-code-is-dead` | — | files |
| `documenting-a-command` | states the port the source actually declares *(regex)* | `fact-checking-by-execution` | — | files |
| `finding-the-change-set` | uses the retargeted base rather than main *(regex)* | `scoping-a-change` | — | git |
| `flake-investigation` | reaches the expiry-window cause *(regex)* | `diagnosing-flakes` | — | files |
| `force-pushing-after-rebase` | requires a lease on the force push *(regex)* | `pushing-safely` | — | git |
| `narrow-check-selection` | names the narrow lane rather than the suite *(regex)* | `refusing-busywork` | — | files |
| `new-fixture-isolation` | allocates the port and directory rather than fixing them *(regex)* | `designing-concurrent-tests` | `diagnosing-flakes` | files |
| `recording-a-ui-demo` | anchors the recording to a served build or a commit *(regex)* | `recording-ui-evidence` | — | files |
| `retiring-a-decision-record` | refuses age and count as the criterion *(regex)* | `curating-decision-records` | `proving-code-is-dead` | files |
| `reviewing-a-diff` | review names the cache-before-confirm defect *(regex)* | `reviewing-as-cis-complement` | — | git |
| `shorten-a-readme` | identifies the repeated presentation rather than only cutting length *(regex)* | `writing-complete-propositions` | `trimming-session-vantage` | files |

Every case carries an outcome grader as its **primary** check, because the runner excludes a `tool_used: Skill` grader for the plugin under test from the score in both arms. The route column is therefore reported, never scored — it answers "which skill did this", not "did it work". Three cases also carry a **near-miss negative**: a sibling that must *not* load, because the prompt sits just outside its boundary. Near-miss negatives are the ones that matter; an obviously-irrelevant negative passes for free and measures nothing.

Every case ships a fixture, and each was verified by running it rather than by reading it — the flaky test genuinely fails intermittently, the claimed 100% coverage really is 100%, the "unused" option really is read, the 900-line README really is 900 lines, and the remote really does carry a commit the clone has never fetched. A case with no fixture cannot measure whether a skill helped, only whether it loaded while the model explained that it could not proceed.

Run them from the repository root:

```sh
claude plugin eval . --no-publish
```

## Three axes, not one

The harness has three independent switches, and the numbers only mean something once you know where all three sat.

```sh
node tests/trigger-harness.mjs                                        # isolated, router shipped
node tests/trigger-harness.mjs --real-environment                     # the reader's actual stage
node tests/trigger-harness.mjs --real-environment --no-router         # descriptions alone
```

**`--no-router` exists because the injection is on by default.** `--plugin-dir` activates the pack's own `hooks/hooks.json`, and it fires even under `--setting-sources ""` — a plugin hook does not come from the operator's settings, so isolation does not strip it. The only way to measure a description without the router in context is to point the run at a copy of the pack with `hooks/` removed, which is what this mode builds.

So the default measurement is of the **shipped configuration**: what a person who installs this pack actually gets. `--no-router` is the baseline that says what the descriptions do on their own. The difference between the two is the injection's contribution, and it is the only number that justifies the injection's per-session cost.

Router injection is therefore reported, not treated as contamination. It is a defect in exactly one case: a `--no-router` run in which the router was injected anyway, which is not a baseline and is marked `INVALID`.

## Isolated is the optimistic number

The offline harness has two modes, and the difference between them is the interesting part.

```sh
npm run test:triggers                                   # isolated
node tests/trigger-harness.mjs --real-environment       # the reader's actual stage
```

Isolated mode strips the operator's own skills, plugins, hooks and MCP servers, so nothing competes with this pack. That makes the result reproducible and **optimistic**: a description that wins on an empty stage may lose on a full one.

Real-environment mode loads all of it. On the machine these cases were written, that is the difference between 33 skills visible with one plugin and 56 visible with six — twenty-three more skills competing for the same prompt, including built-ins whose territory genuinely overlaps this pack's (`debug` against a flake investigation, `simplify` and `code-review` against a check-selection or review prompt).

A miss in real-environment mode is therefore two different findings wearing one face: a weak description, or a stronger competitor. The `observed:` line in the report distinguishes them, because it names every skill that did load.

The runner adds a no-plugin baseline arm by default and reports the score delta, so a case that would have been answered just as well without the pack shows up as a small delta rather than as a pass.

## Running them without early access

`claude plugin eval` is gated to early access. [`tests/trigger-harness.mjs`](../tests/trigger-harness.mjs) reads these same case files and drives `claude -p` directly, so a contributor without access can still get a number:

```sh
node tests/trigger-harness.mjs --dry-run     # free: preflights and isolation fingerprint
node tests/trigger-harness.mjs               # billed: one model call per case
```

It is deliberately **not** the official runner and its numbers are not the runner's. It isolates harder (`--setting-sources ""`, which removes the operator's personal skills, plugins, MCP servers and hooks), it counts only Skill calls that actually loaded where the runner counts any `tool_use` block, and it scores `regex` and `file_exists` graders but has no judge, so an `llm` grader comes back `UNSCORED` rather than guessed at. It is never run in CI: the calls are billed and nondeterministic, which is the profile `diagnosing-flakes` warns against.

### Fixtures

A case's `fixture/` directory is copied into the scratch working directory before the run. Git state is declared rather than scripted — a `fixture.sh` per case would be shorter and would mean that cloning this repository and running the suite executes shell contributed by whoever sent the last pull request, so the harness owns every command instead:

| Declaration | What it builds |
|---|---|
| `fixture_git: true` | `fixture/` committed as `main` |
| `fixture_branch: <name>` | the working branch, carrying `fixture-branch/` |
| `fixture_other_base: <name>` | a second candidate base carrying `fixture-other-base/`, for a retargeted branch |
| `fixture_base_moved: true` | a later commit on `main` from `fixture-base-moved/`, so the merge base is not main's tip |
| `fixture_remote: true` | a bare `origin` in a sibling directory — no network |
| `fixture_remote_ahead: true` | a commit pushed to `origin` by someone else, deliberately **not** fetched |
| `fixture_rebased: true` | the local tip rewritten with `fixture-rebased/`, so the branches genuinely diverge |

## Four rounds of running it, and what each round found

Every round of measurement found defects in the corpus before it found anything about a description. That is not a preamble to the results — it is the most transferable thing in this file, because the same shape recurred four times: **a red check is a question, and the first thing to check is the check.**

| Round | What was measured | What it actually found |
|---|---|---|
| 1 | six cases, isolated, one run | Two broken cases, not two broken skills. Runs started in an empty directory, so a prompt naming a file sent the model globbing for something absent; and `max_turns: 3` ended a run mid-read. Fixed by adding fixtures and raising the limit — **not** by rewriting prompts until they passed. |
| 2 | fifteen cases, real environment, both arms, one run | A board of 13 PASS against 9, published, then invalidated by reading its own transcripts: only 2 of 15 shipped runs produced any answer at all. Thirteen cases still had no fixture, `max_turns` was below the runner's default, and `runs: 1` opted out of its floor. |
| 3 | one case, repeatedly | `reviewing-a-diff` failed four times for four different reasons — empty directory, turn limit, the router's own wording read as an adoption gate, and a built-in winning the prompt. Editing the wording the model had quoted removed the stated reason and not the behaviour. |
| 4 | fifteen cases, both arms, three runs, outcome graders | The results below. Both remaining failures turned out to be defects in the case rather than in the pack: one fixture that never did what its prompt said, and one grader too narrow to accept a correct answer. |

The corpus also violated three floor invariants the official runner documents as non-negotiable, and did so for its entire existence until they were checked: every case was graded only by `tool_used` (which the runner excludes from the score), every case set `runs: 1` against a default of 3, and no case had an outcome grader. The gate now fails all three, each with a negative control.

## What the injection is worth

Taken 2026-09-08 against CLI 2.1.263, model `sonnet`, **three runs per case in real-environment mode** — the operator's own skills, plugins, hooks and MCP servers loaded, 88 tools and six plugins visible. Both arms ran the same 15 cases: 45 runs each, 90 model calls, $17.37 of token pricing.

Every case is graded by an **outcome** grader — did the answer contain what the user would have noticed the absence of — plus a display-only `tool_used` grader recording which skill loaded. The runner excludes the second from the score in both arms, so the two columns below are not interchangeable, and the difference between them is the finding.

| | Runs that produced the right answer | Runs where the asserted skill loaded |
|---|---|---|
| shipped configuration | **38 of 48 — 79%** | 48 of 51 — 94% |
| `--no-router`, descriptions alone | **31 of 48 — 65%** | 33 of 51 — 65% |
| difference | **+14 points** | +29 points |

**The injection moves routing more than twice as much as it moves outcomes.** That is the number worth carrying away, and it is a correction: an earlier version of this file published a board of 13 PASS against 9 that was built on routing alone, and so overstated the injection's value by roughly a factor of two.

The two differences also do not stand equally. Treating each run as an independent sample, the routing difference is z ≈ 3.9 (p < 0.0001) and the outcome difference is z ≈ 1.6 (p ≈ 0.11). So: **the injection is measured to change which skill loads, and is not yet measured to change what the user gets.** Ruling that in or out needs more runs, not more argument. Reported as case verdicts, where a grader that passes some runs and not others is `PARTIAL` rather than rounded:

| Arm | PASS | PARTIAL | FAIL |
|---|---|---|---|
| shipped configuration | 7 | 6 | 2 |
| `--no-router` | 3 | 7 | 5 |

### What the failures were, and what they were not

Not one failure on either arm was a competitor winning the prompt, and not one was a description failing to fire — in these boards the asserted skill loaded on 94% of shipped runs. Every failure was an outcome failure, which is the class the previous corpus could not see at all. Two of them turned out not to be failures of the pack:

- **`force-pushing-after-rebase`** — `pushing-safely` loaded 3/3, and `--force-with-lease` appeared 0/3. Reading the answer showed why: it fetched, found the local tip was an *ancestor* of origin rather than a divergent rewrite, and correctly answered `git merge --ff-only` while naming the teammate's commit a bare force push would drop. **The fixture was wrong**, not the skill and not the model: the prompt says the branch was rebased and the fixture had never rebased anything. It now rewrites the local tip, so the branches genuinely diverge (verified: two commits unique to origin, one to the clone).
- **`retiring-a-decision-record`** — `curating-decision-records` loaded 3/3, outcome 0/3. The answer classified 60 records by status and chronology and said outright that it rested on those *"not on age or count"* — which is exactly what the grader asks for, in words the pattern did not accept. **A false negative in the grader.** The pattern was widened and that measured sentence is now a pinned positive control, so the phrasing cannot be lost again.

Both were repaired after this board was taken and re-run; their cells above are the pre-repair ones. The general lesson is the one the pack already makes elsewhere: a red check is a question, and the first thing to check is the check.

### Read the boards this way

- **Three runs per case, 15 cases.** A `PARTIAL` is a real intermittency, not noise to be re-rolled. An all-green board at three runs still cannot support a claim of 90% or better, which needs n ≥ 29.
- **The runs are paired by case**, so the independence the z-scores above assume is only approximate. A paired test on 15 cases is the right analysis and has not been done.
- **Outcome graders are hand-written regular expressions**, pinned from both sides in [`tests/grader-controls.mjs`](../tests/grader-controls.mjs) — 72 controls, positives quoting real recorded answers where one exists, and every case carrying a negative written specifically to defeat that pattern's structure. Two such negatives have already caught a pattern that did not discriminate. That protects against a pattern that accepts anything; it does not protect against one that is too narrow, which is what `retiring-a-decision-record` was.

### The previous boards, and why they are gone

An earlier measurement published 13 PASS out of 15 for the shipped configuration against 9 for the baseline, and called it four failures fixed. Inspecting the 31 transcripts behind it showed that in the shipped arm only **2 of 15 runs produced any real answer**: seven refused with some form of "this directory is empty", and six ended at `max_turns` with no final message at all. Thirteen of the fifteen cases shipped no fixture, so the model opened an empty scratch directory and had nothing to work on; `max_turns` was set to 3–6 against the runner's default of 10, and `runs` to 1 against its default of 3.

Those boards recorded whether a skill loaded during runs in which the model was mostly explaining that it could not proceed. They are not reproduced here because the corpus they were taken from no longer exists — every case now ships a verified fixture, and the floors are enforced by the gate.

## What is still open

**The official runner has never run these.** `claude plugin eval` reports `plugin eval is currently in early access` on this machine, so every number in this file came from the offline harness. Three schema defects were repaired against the runner's own definition before that was true of anything: every case was missing the required `schema_version`; every grader spelled `arm: with_only` where the schema is `enum(["with-only", "both"])`; and both near-miss negatives set `max: 0` with no `min`, leaving an unsatisfiable range that would have parsed green forever.

Open, in the order that would change a conclusion here:

- **Correspondence with the official runner is unverified.** The two will not match exactly — they differ in isolation, in how a refused Skill call is counted, in whether a baseline arm runs, and in whether an `llm` grader can be scored at all. Whether they agree on which cases pass is the question. **Verification owner:** anyone with `plugin eval` access, on one run.
- **Outcome graders are protected against being too broad, not against being too narrow.** [`tests/grader-controls.mjs`](../tests/grader-controls.mjs) pins each pattern from both sides, and its `--self-test` catches a control that has stopped exercising its pattern. Neither catches a pattern that rejects a correct answer phrased in words nobody thought of, which is precisely what happened to `retiring-a-decision-record`. The mitigation is to add every measured phrasing as a sourced positive, which only works after a run has produced it.
- **The `llm` grader on `claiming-done` has never been scored.** It reports `UNSCORED` offline and needs a judge — a sonnet-tier or larger model that is *not* the agent model, per the runner's guidance on self-preference.
- **The analysis treats 48 runs as independent** when they are paired by case. A paired test across the 15 cases is the right one and has not been run.
- **Three runs per case will not support a rate.** An all-green board at n=3 is not evidence of 90%; that needs n ≥ 29.

The numbers decide whether a description needs work, not a reading of the description text — and an outcome grader decides whether the skill behind it was worth loading.
