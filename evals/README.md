# Trigger evals

A skill in a plugin has no always-loaded instruction file behind it. Its `description` is the entire trigger surface, which makes description quality a measurable property rather than a matter of taste — and the failure mode is under-triggering, silently, on exactly the tasks the skill was written for.

These cases measure that. Each pairs a realistic prompt with `tool_used` graders asserting which skill loads, and several assert a **near-miss negative** — a skill that must *not* load, because the prompt sits just outside its boundary. Near-miss negatives are the ones that matter; an obviously-irrelevant negative passes for free and measures nothing.

There is one case per **model-invocable** skill — the drift gate fails if such a skill has no case asserting it loads, because a description nobody measured is a claim with no evidence behind it. The router is exempt and has no case: it carries `disable-model-invocation: true`, so a trigger case for it could only ever fail, and requiring an impossible case would make this corpus dishonest rather than complete. Three cases also carry a **near-miss negative**, on the boundaries most likely to be confused:

| Case | Must load | Must not load |
|---|---|---|
| `adapter-bootstrap` | `adapting-to-a-project` | — |
| `adding-a-validator` | `proving-the-regression` | — |
| `change-narration-cleanup` | `trimming-session-vantage` | — |
| `claiming-done` | `what-counts-as-evidence` | — |
| `deleting-an-unused-option` | `proving-code-is-dead` | — |
| `documenting-a-command` | `fact-checking-by-execution` | — |
| `finding-the-change-set` | `scoping-a-change` | — |
| `flake-investigation` | `diagnosing-flakes` | — |
| `force-pushing-after-rebase` | `pushing-safely` | — |
| `narrow-check-selection` | `refusing-busywork` | — |
| `new-fixture-isolation` | `designing-concurrent-tests` | `diagnosing-flakes` |
| `recording-a-ui-demo` | `recording-ui-evidence` | — |
| `retiring-a-decision-record` | `curating-decision-records` | `proving-code-is-dead` |
| `reviewing-a-diff` | `reviewing-as-cis-complement` | — |
| `shorten-a-readme` | `writing-complete-propositions` | `trimming-session-vantage` |

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

It is deliberately **not** the official runner and its numbers are not the runner's. It isolates harder (`--setting-sources ""`, which removes the operator's personal skills, plugins, MCP servers and hooks), it counts only Skill calls that actually loaded where the runner counts any `tool_use` block, and it runs a single arm — so a pass shows the skill fired, not that this pack caused it to. It is never run in CI: the calls are billed and nondeterministic, which is the profile `diagnosing-flakes` warns against.

A case may ship a `fixture/` directory beside its `case.yaml`; its contents are copied into the scratch working directory before the run.

## First measurement

Taken 2026-09-08 against CLI 2.1.260, model `sonnet`, at one run per case.

| Case | Skill asserted | Result |
|---|---|---|
| `flake-investigation` | `diagnosing-flakes` | loaded |
| `narrow-check-selection` | `refusing-busywork` | loaded |
| `change-narration-cleanup` | `trimming-session-vantage` | loaded |
| `claiming-done` | `what-counts-as-evidence` | loaded (case PARTIAL — the `llm` grader is unscorable offline) |
| `new-fixture-isolation` | `designing-concurrent-tests` | loaded; near-miss negative held |
| `shorten-a-readme` | `writing-complete-propositions` | loaded; near-miss negative held |

**Read this as six single samples, not as a rate.** A skill that fires half the time shows green half the time here. Claiming 90% or better from an all-green board needs n≥29.

The five file-independent cases were measured in one pass; `shorten-a-readme` was measured separately after the fixes below, so this table is a composite rather than one clean board. A fresh full run is one command.

### What the first run found was two broken cases, not two broken skills

Both failures were the harness's and the corpus's, which is the ordinary outcome of running a test for the first time:

- Every run starts in an empty scratch directory, so a prompt naming a file sent the model globbing for something that did not exist; it asked a clarifying question and never reached a skill decision. Fixed by the `fixture/` mechanism — **not** by rewriting the prompt until it passed, which would be tuning the test to the answer.
- `max_turns: 3` was too low for a case that has to locate and read a file: the run ended mid-read, before any decision. Raised to 6 for that case only.

## What the injection is worth

Taken 2026-09-08 against CLI 2.1.263, model `sonnet`, one run per case, **in real-environment mode** — the operator's own skills, plugins, hooks and MCP servers all loaded, 88 tools and six plugins visible. Both arms ran the same 15 cases.

| Arm | PASS | PARTIAL | FAIL |
|---|---|---|---|
| `--no-router` — descriptions alone | 9 | 1 | 5 |
| shipped configuration — `hooks/hooks.json` injects the router | 13 | 1 | 1 |

**Four of the five failures were fixed by the injection.** That difference is the entire justification for spending roughly 1,800 tokens of every session on it; without a number here, the hook would be ceremony.

Two things about the baseline are worth stating plainly, because both cut against the pack:

- **Every one of the five baseline failures was `no Skill call`.** Not one was lost to a competitor. With 88 tools available the model simply started working — the first move in the transcript is `ls -la`. So the failure mode these descriptions have is not "a stronger skill won"; it is "no skill was considered at all", which is the failure a description cannot fix, because a description is only read once something is already looking for a skill.
- **The board is 15 cases, and the baseline run printed 16.** The extra row was `which-skill-applies`, which asserted that the router loads; it was retired when the router took `disable-model-invocation: true`, since a human-only skill can never satisfy it. It passed in that run. Excluding it is what makes the two arms comparable, and it is why the baseline reads 9 rather than 10.

**Read each board as 15 single samples, not as a rate.** A skill that fires half the time shows green half the time here. The 4-of-5 difference is larger than sampling noise can account for in one direction, but a repeat run will not reproduce these boards cell for cell.

### The one case that stayed red

`reviewing-a-diff` has been attempted six times and has never passed. Two of those attempts measured nothing — the setup was broken — and four are real measurements. The sequence matters, because the last two runs corrected a conclusion drawn from the third.

**Two setup defects, found by running it:**

1. **Empty scratch directory** — the prompt named a branch and there was no repository, so the model went looking for a file that did not exist and asked a clarifying question. Fixed by `fixture_git: true`, which builds a real two-commit repo with the change on a `review-me` branch.
2. **`max_turns: 3`** — the run ended mid-read, before any skill decision. Raised to 6.

**Four measurements, with the fixture in place:**

| # | Router | Description | Observed |
|---|---|---|---|
| 1 | shipped, precondition wording | original | `no Skill call` |
| 2 | shipped, section rewritten | original | `code-review(loaded)` |
| 3 | shipped, section rewritten | rewritten | `no Skill call` |
| 4 | `--no-router` | rewritten | `code-review(loaded)` |

Run 1 gave a legible reason: *"No `.ledger.yml` here, so the ledger pack isn't actually adopted in this repo — I'll skip that overhead. It's a small single-file diff, so let me just read it directly."* The router had invited exactly that, by saying "if that file does not exist, start with `adapting-to-a-project`" — which reads as a precondition. So the router gained a section stating outright that a missing adapter does not mean the disciplines do not apply.

Run 3 is the one worth keeping, because it undid that conclusion. With the section in place, the model's *first* command was `ls -la; test -f .ledger.yml && echo HAS_LEDGER_YML || echo NO_LEDGER_YML`. It found no adapter and then loaded nothing at all. **Editing the prose the model had quoted did not change the behaviour; it removed the stated reason for it.** The new section plausibly made things worse: it names `.ledger.yml` three times, raising the file's salience in the very context where the goal was to lower it. That is a mechanism worth naming, not a demonstrated one — a single run cannot separate it from noise.

Run 4 is the cleanest single result here. With the router stripped, so the description is the whole trigger surface, a Claude Code built-in won: `code-review` owns the words "review this diff" outright. Two descriptions, four runs, zero loads of the asserted skill. **What has been ruled out by measurement rather than by argument is that a better `description` fixes this case.**

Two facts run through all four:

- **The model found the planted bug every time** — the cache populated before the backend write is confirmed, in both `put` and `putMany`. Unaided, with a built-in loaded, and with the router in context.
- **This case's grader asserts that a skill loaded, not that the review was good.** That limitation is listed as an open issue further down this file. It stopped being theoretical here: the outcome the case exists to protect succeeded four times out of four, and the case reported `FAIL` four times out of four.

The repair is therefore an outcome grader — assert the review names the cache-before-confirm defect, whatever route it took — or an explicit decision that this case measures routing only and needs a separate outcome case beside it. **Neither has been done, and neither should be chosen by whichever one turns the board green.**

One more caution, and it is the sharpest one available: the shipped arm returned two different `observed:` lines on consecutive runs of the same case and the same configuration. A single run of this case cannot distinguish *a competitor won* from *nothing was considered*. Every board in this file is a set of single samples, and this is what that costs.

## Status: authored, schema-checked, and now executed once

**The official runner has still never run them.** `claude plugin eval` reports `plugin eval is currently in early access` on this machine. Every number above came from the offline harness instead.

The first draft predicted that field names would need fixing before descriptions did. That prediction was correct, and three defects were repaired against the runner's own schema definition:

- every case was missing the required `schema_version`, which a pre-validation guard rejects outright;
- every grader spelled `arm: with_only`, where the schema is `enum(["with-only", "both"])`;
- both near-miss negatives set `max: 0` with no `min`, leaving an unsatisfiable range — a file that would have parsed green and never been satisfiable.

The positive graders now carry no `arm` at all, because a `tool_used: Skill` grader is treated as a plugin-fired indicator on its own. The negatives carry `arm: both`, because an assertion that a skill must *not* load has to be scored in both arms to mean anything.

What remains unverified is correspondence: whether these cases score the same under `claude plugin eval` as under the offline harness. They will not match exactly — the two differ in isolation, in how a refused Skill call is counted, and in whether a baseline arm runs. **Verification owner:** anyone with `plugin eval` access, on one run.

Ten cases were added after the first measurement and have never been run — they are structurally checked (schema, grader bounds, that they assert a shipped skill) but behaviorally unproven, exactly as the first six were before anyone ran them. Also still open: most graders assert only that a skill loaded, not that it helped.

The numbers decide whether a description needs work, not a reading of the description text.
