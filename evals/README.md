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

## What the injection is worth: nothing that this corpus can detect

Taken 2026-09-09 against CLI 2.1.263, model `sonnet`, three runs per case in real-environment mode, both arms in one pass, with every measurement defect listed below already fixed. 90 model calls. Of those, 42 of 45 shipped runs and 44 of 45 baseline runs completed normally; the exclusions are named in the boards.

| | Runs that produced the right answer | Runs where the intended skill loaded |
|---|---|---|
| shipped configuration | 34 of 42 — 81% | 50 of 54 — 93% |
| `--no-router`, descriptions alone | 36 of 44 — 82% | 44 of 53 — 83% |
| difference | **−1 point**, z = −0.10 | +10 points, z = 1.52 |

Paired by case, which is the right analysis because the arms share their cases: **two cases better with the injection, two worse, eleven unchanged.** Exact sign test p = 1.0. Paired t(14) = −0.27.

**No effect on outcomes was detected, and the effect on routing did not reach significance.** The injection also has a measured cost beyond its 1,800 tokens: three of the 45 shipped runs exhausted their turn budget and produced no final answer, against none of the 45 baseline runs.

Two things this does **not** say. It does not say the injection is useless — at fifteen cases and three runs each, this corpus could not detect an effect smaller than roughly twenty points, and failing to detect is not the same as ruling out. And it does not say the skills do not work: both arms answered correctly about four times in five.

### This is the third number published here, and the first two were artefacts

| Published | Claimed | What was actually wrong |
|---|---|---|
| 13/15 against 9/15, "four failures fixed" | a large routing gain | Thirteen cases had no fixture, so the model opened an empty directory. Only 2 of 15 shipped runs produced any answer. The board measured routing during runs that could not show help. |
| 79% against 65% outcomes, 94% against 65% routing | routing gains twice the outcome gain | Runs cut off at the turn limit were scored as wrong answers, and three fixtures did not build the situation their prompt described. |
| 93% against 67%, z = 3.16 | a large, significant gain on both | **Ten baseline runs never reached the model at all** — `subtype: "success"` with `is_error: true` and a body reading `Not logged in · Please run /login`. All ten were in the arm whose failure made the pack look better. |

Every one of the three erred in the pack's favour, and none of the three was caught by reading the numbers. Each was caught by reading the runs behind them. That is the practice worth copying, and [`tests/audit-failures.mjs`](../tests/audit-failures.mjs) exists to make it cheap.

### The always-on hook is currently unjustified

`hooks/hooks.json` injects the router into every session by default, and the stated reason was a measurement. That measurement does not survive. Until a larger corpus says otherwise, the honest position is that the injection costs about 1,800 tokens per session and occasionally a turn budget, for no benefit this corpus can see.

Detecting a ten-point difference at 80% power would need roughly 200 runs per arm rather than 45. That is about $80 at the rates observed here, and it is the experiment that would settle it.

### What the four re-run cases found, and none of it was a description

Not one failure on either arm was a competitor winning the prompt, and not one was a description failing to fire — the intended skill loaded on 94% of shipped runs. Every failure was an outcome failure, the class the previous corpus could not see at all. Four cases were then re-run, and each one had been failing for a reason that was not the pack's:

- **`force-pushing-after-rebase`** — `pushing-safely` loaded 3/3 and `--force-with-lease` appeared 0/3. The answer had fetched, found the local tip was an *ancestor* of origin rather than a divergent rewrite, and correctly said `git merge --ff-only` while naming the teammate's commit a bare force push would drop. **The fixture was wrong:** the prompt says the branch was rebased and the fixture had never rebased anything. `fixture_rebased` now rewrites the local tip; verified that the branches diverge, two commits unique to origin and one to the clone. It scores 2/3 on both arms since.
- **`retiring-a-decision-record`** — `curating-decision-records` loaded 3/3 and the outcome scored 0/3 against an answer that classified 60 records by status and chronology, said it rested on those *"not on age or count"*, and separately caught **two defects in the fixture**: every `Superseded` record pointed at an unrelated topic, because the script that repaired the dangling links had picked any existing file without regard to subject; and two records were dated in the future. The fixture was rebuilt with a coherent per-topic timeline and exactly one deliberate dead link. The grader was re-anchored too — instead of demanding a sentence about age, it now asks for the dead successor's identifier, which only a real read produces. 3/3 shipped, 2/3 baseline since.
- **`adapter-bootstrap` and `change-narration-cleanup`** — both were being cut off at the turn limit, which is the harness's budget rather than a wrong answer. Their tasks require *running* commands and *editing* files, not just replying. Limits raised, and a truncated run is now excluded from the outcome denominator and reported separately rather than counted as a failure.

Two harness defects surfaced alongside them, both of the same shape — the measurement charging its own limits to the thing being measured:

- **A flat per-call budget of $0.50** cut off the case with sixty files to read, mid-answer. The cap now scales with the case's turn allowance.
- **Both arms wrote their transcripts to the same directory**, because its name carried the case count and not the arm. The baseline silently overwrote every transcript the shipped arm had just produced, so a board could no longer be diagnosed against the runs behind it. The directory now names the arm. This was found the hard way, after the evidence for one board was already gone.

And one that would have quietly falsified a report: **`--case` read only its first occurrence.** A two-case re-run measured one case and said nothing about the other. It is repeatable now, and an unknown case name exits 2 rather than billing for a run nobody asked for.

The lesson is the one the pack makes elsewhere: a red check is a question, and the first thing to check is the check.

### Read the boards this way

- **Three runs per case, 15 cases.** A `PARTIAL` is a real intermittency, not noise to be re-rolled. An all-green board at three runs still cannot support a claim of 90% or better, which needs n ≥ 29.
- **The runs are paired by case**, so the independence the z-scores above assume is only approximate. A paired test on 15 cases is the right analysis and has not been done.
- **Outcome graders are hand-written regular expressions**, pinned from both sides in [`tests/grader-controls.mjs`](../tests/grader-controls.mjs) — 72 controls, positives quoting real recorded answers where one exists, and every case carrying a negative written specifically to defeat that pattern's structure. Two such negatives have already caught a pattern that did not discriminate. That protects against a pattern that accepts anything; it does not protect against one that is too narrow, which is what `retiring-a-decision-record` was.

### The previous boards, and why they are gone

An earlier measurement published 13 PASS out of 15 for the shipped configuration against 9 for the baseline, and called it four failures fixed. Inspecting the 31 transcripts behind it showed that in the shipped arm only **2 of 15 runs produced any real answer**: seven refused with some form of "this directory is empty", and six ended at `max_turns` with no final message at all. Thirteen of the fifteen cases shipped no fixture, so the model opened an empty scratch directory and had nothing to work on; `max_turns` was set to 3–6 against the runner's default of 10, and `runs` to 1 against its default of 3.

Those boards recorded whether a skill loaded during runs in which the model was mostly explaining that it could not proceed. They are not reproduced here because the corpus they were taken from no longer exists — every case now ships a verified fixture, and the floors are enforced by the gate.

## The first measured, positive result — and the defect it found

`/ledger:receipts` against itself off, 16 pairs, blind `opus` judge over a weighted rubric, `sonnet` as the agent, Bash granted, both arms carrying the plugin. Two batches: twelve pairs across four cases, then four more deliberately drawn from the two cases where the contrast was weakest.

| Dimension | Weight | Off | On | Δ |
|---|---|---|---|---|
| correctness | 0.35 | 3.00 | 4.50 | **+1.50** |
| attribution | 0.25 | 2.42 | 4.75 | +2.33 |
| gaps | 0.20 | 2.42 | 4.50 | +2.08 |
| calibration | 0.10 | 3.83 | 4.58 | +0.75 |
| usability | 0.10 | 3.17 | 4.25 | +1.08 |
| **weighted** | | **2.84** | **4.55** | **+1.71** |

That is the first batch. Pooled over all 16 pairs the weighted difference is **+1.20**, with 13 wins and 3 losses, paired t(15) = 3.13, sign test p = 0.021. The two batches disagree in size (+1.71 against −0.34), and the second is four pairs drawn from the hardest two cases rather than a random sample — so read +1.71 as optimistic, +1.20 as conservative, and the between-case variance as large.

**Correctness is the load-bearing row.** It carries the highest weight precisely to catch the failure that matters — buying better form with worse substance — and it moved the most of any heavily-weighted dimension. The discipline did not trade accuracy for presentation.

The mechanism turned out not to be presentation at all. In the losing arm the model repeatedly answered from priors: *"The current directory is empty — there's no code here for me to search"*, after four turns. The directory held five files. With `receipts` on, the same prompt produced sixteen turns of grep, positive control, and file reads. **The skill's effect is on whether evidence gets gathered, not on how it gets formatted.** Cost: 2.0× the turns, 1.6× the spend, 1.9× the length.

### It also caught the skill breaking its own rule

One run had `receipts` on, followed rules 1, 2, 5 and 10 scrupulously — said what ran, marked itself unverified, listed what it had not checked, ended with what would settle it — and opened with this:

> The working directory is empty […] `ls -la /private/var/…/receipts-2F6Uoa` → empty (only `.` and `..`).

The harness recorded the directory contents at the end of that run: five files. Two turns were spent, `ls -la` among them, and the empty result became a conclusion.

**The discipline shaped a false observation into a credible-looking one**, which is worse than an unshaped false observation because it is harder to doubt. The defence was already rule 6 and it was written too narrowly — it spoke of a "zero-result search" when the failure was a claim of absence about a directory. It now reads: *an absence is a claim, and it needs the same evidence as a presence*, with the measured failure quoted in the skill itself.

That is what an eval is for. A rubric score of +1.71 would have been a pleasant number to publish and nothing more; the finding came from reading the runs.

### What this measurement cannot tell you

- **One judge model, one agent model.** A different judge may weigh attribution differently. Nothing here is cross-validated.
- **Sixteen pairs.** The between-batch spread is wider than the pooled difference's standard error suggests is comfortable.
- **Both arms carry the plugin.** This is not evidence about the pack as a whole — the sixteen long-horizon skills remain [unmeasurable at this scale](#what-the-injection-is-worth-nothing-that-this-corpus-can-detect), which is why `receipts` exists.
- **The judge never ran anything.** It graded correctness against source it was shown, so a claim that is wrong in a way the source does not reveal scores as right.

## Grading an output style needs a judge, not a pattern

The fifteen trigger cases ask whether a discipline was reached for and whether the answer contained a specific fact. Neither question fits `receipts`, which governs how *every* claim is presented. A regex cannot see the interesting failure there — buying better form with worse substance, an answer that is tidier and also wronger.

[`tests/receipts-eval.mjs`](../tests/receipts-eval.mjs) grades it the way that failure demands:

```sh
npm run eval:receipts                       # billed
node tests/receipts-eval.mjs --dry-run      # free: preflight only
```

Four cases with real fixtures, three runs each, both arms in one pass. Each pair goes to a **blind pairwise judge** over a weighted rubric — correctness 35%, attribution 25%, gap disclosure 20%, calibration 10%, usability 10%.

Five design choices carry the result, and each answers a way this could have fooled itself:

| Choice | What it prevents |
|---|---|
| Judge is `opus`, agent is `sonnet` | a model grading its own output prefers it |
| A and B presented in randomised order | the judge learning that one slot always wins |
| The fixture's source is given to the judge | "correctness" judged against the code rather than against plausibility |
| Correctness weighted highest | a format change that quietly costs accuracy passing as an improvement |
| Bash granted | with it denied, "nothing ran" dominates every answer and the contrast collapses |

**Both arms carry the plugin.** The contrast is `/ledger:receipts` on against off — not this pack against no pack. And every pair's two full answers are written to `evals/results/receipts-*/`, because the lesson of the four rounds above is that a number is not trustworthy until someone has read the runs behind it.

## Auditing the graders against real answers

`tests/grader-controls.mjs` pins each pattern from both sides and catches one of the two ways a pattern can go wrong: drifting wide enough to accept anything. It cannot catch the other. A pattern narrow enough to reject a correct answer looks exactly like a skill that failed, and reports as one.

```sh
npm run analyze:failures            # every recorded transcript
node tests/audit-failures.mjs <dir> # one captures directory
```

It replays every outcome grader against every recorded answer and prints the ones it rejected. **Each rejection is a question, not a verdict.** Read the answer: if it did the job, the pattern is too narrow — widen it, and pin that phrasing as a sourced positive so it cannot be lost again.

Running it the first time found something else entirely. Ten runs in one arm had never reached the model at all: the session returned `subtype: "success"` with `is_error: true` and a 33-character body reading `Not logged in · Please run /login`. The harness had no idea, so ten non-measurements were scored as ten wrong answers, in the arm that made the pack look better. The harness now marks such a run `INVALID`, and refuses to start a billed suite at all until one cheap call proves the session can reach the model.

## What is still open

**The official runner has never run these.** `claude plugin eval` reports `plugin eval is currently in early access` on this machine, so every number in this file came from the offline harness. Three schema defects were repaired against the runner's own definition before that was true of anything: every case was missing the required `schema_version`; every grader spelled `arm: with_only` where the schema is `enum(["with-only", "both"])`; and both near-miss negatives set `max: 0` with no `min`, leaving an unsatisfiable range that would have parsed green forever.

Open, in the order that would change a conclusion here:

- **Correspondence with the official runner is unverified.** The two will not match exactly — they differ in isolation, in how a refused Skill call is counted, in whether a baseline arm runs, and in whether an `llm` grader can be scored at all. Whether they agree on which cases pass is the question. **Verification owner:** anyone with `plugin eval` access, on one run.
- **Outcome graders are protected against being too broad, not against being too narrow.** [`tests/grader-controls.mjs`](../tests/grader-controls.mjs) pins each pattern from both sides, and its `--self-test` catches a control that has stopped exercising its pattern. Neither catches a pattern that rejects a correct answer phrased in words nobody thought of, which is precisely what happened to `retiring-a-decision-record`. The mitigation is to add every measured phrasing as a sourced positive, which only works after a run has produced it.
- **The `llm` grader on `claiming-done` has never been scored.** It reports `UNSCORED` offline and needs a judge — a sonnet-tier or larger model that is *not* the agent model, per the runner's guidance on self-preference.
- **The analysis treats 48 runs as independent** when they are paired by case. A paired test across the 15 cases is the right one and has not been run.
- **Three runs per case will not support a rate.** An all-green board at n=3 is not evidence of 90%; that needs n ≥ 29.

The numbers decide whether a description needs work, not a reading of the description text — and an outcome grader decides whether the skill behind it was worth loading.
