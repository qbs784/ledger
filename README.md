<div align="center">

<img src="assets/logo.svg" alt="ledger" width="300">

**Every claim your agent makes arrives with the evidence behind it.**

[![gate](https://github.com/qbs784/ledger/actions/workflows/gate.yml/badge.svg)](https://github.com/qbs784/ledger/actions/workflows/gate.yml)
[![license MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**English** · [简体中文](README.zh-CN.md)

</div>

## Install

Paste this into your agent:

```text
Install the ledger skill pack from https://github.com/qbs784/ledger, following the repo's AGENTS.md.
```

Or do it yourself:

```sh
claude plugin marketplace add qbs784/ledger
claude plugin install ledger@ledger
```

Then type `/ledger:receipts`. It stays on until you say `stop receipts`.

## What changes in the next answer

Real excerpts, not an illustration. Same prompt (*"Coverage is at 100% on the new module and CI is green. Is this feature done?"*), same repository, same model, `claude -p` with Bash denied. Left: this pack installed. Right: `/ledger:receipts` typed first. Full runs are reproducible from the [`claiming-done` fixture](evals/triggers/claiming-done/fixture).

<table>
<tr><td width="50%">

**Without it**

> No — and the two signals you're citing don't bear on the question.
>
> ## What those signals actually prove
>
> `coverage-summary.txt` is a checked-in text file whose header says `# last CI run` […] Separately, I could not run `npm test` or `node --test`: Bash execution is denied in this mode. So everything below is read from source, not observed failing.
>
> […]

*The admission that nothing ran is real, and it is in the third paragraph. There is no list of what went unchecked.*

</td><td width="50%">

**With it**

> ## No. And note that I did not observe either of the two things you cited.
>
> **What actually ran:** `find /tmp/recdemo -mindepth 1 | sort`, plus reading all 4 files. `npm test` was **denied** by the permission system. **No test has run in this session. I have not seen a single assertion execute.**
>
> […] Two defects follow from reading the source. **Neither is verified — I could not run the probe that would settle them.**
>
> ### What I did not check
> - Whether the CI job named `check` exists or passed — no config present, no network call made.
> - Whether the module is wired into anything […]

*What ran comes first. Unverified findings say so at the point of claim. The gaps are enumerated.*

</td></tr>
</table>

Both answers found the same real defect. Only one of them tells you how much of it was observed.

**Measured, not asserted.** Sixteen pairs like this one, graded by a blind `opus` judge over a weighted rubric while `sonnet` produced the answers: weighted **2.84 → 4.55** on the first batch and **+1.20** pooled across all sixteen, 13 wins to 3, sign test p = 0.021. The row that carries the most weight is correctness, and it moved **+1.50** — the discipline did not buy better form with worse substance. It costs 2.0× the turns and 1.6× the spend. Method, caveats, and the defect this measurement found *in the skill itself* are in [evals/README.md](evals/README.md).

## The ten rules

Full text in [`skills/receipts/SKILL.md`](skills/receipts/SKILL.md).

1. A claim about state names the command that produced it.
2. If you did not run it, say so in the same sentence as the claim.
3. Quote the output; do not summarise it.
4. Separate "the check passed" from "the thing works."
5. State what you did not verify, and why.
6. An absence is a claim, and needs the same evidence as a presence.
7. Never report a plan as a result.
8. A queued merge is not a landing. Coverage is not evidence.
9. Answer "did it work?" with the evidence first and the conclusion second.
10. "I don't know" is a complete answer — followed by the one command that would settle it.

## The rest of the pack

`/ledger:receipts` is the front door. Behind it are twenty-two skills for the failures that only show up over a long horizon: prose that stops describing the code, rules that go unenforced, dead surface nobody can prove is dead. Type `/ledger:using-ledger` for the map, or reach for one directly.

| Skill | Reach for it when |
|---|---|
| `receipts` | **the front door** — every claim arrives with its evidence |
| `using-ledger` | unsure which skill applies |
| `adapting-to-a-project` | setting up in a new repository |
| `what-counts-as-evidence` | about to state that something works, passes, or is done |
| `refusing-busywork` | choosing checks, or about to repeat one that passed |
| `qualifying-a-request` | a request for new work arrives, before any design exists |
| `specifying-acceptance` | writing acceptance criteria, or declaring what a behavior means |
| `planning-the-work` | turning an approach into units, their order, and where each runs |
| `running-a-bounded-loop` | carrying one unit to done, or defining its exit gate |
| `scoping-a-change` | working out what a change actually touches |
| `proving-the-regression` | adding a guard; asserting a fix works |
| `designing-concurrent-tests` | a test touches ports, files, env, clocks, or teardown |
| `diagnosing-flakes` | a test fails intermittently |
| `writing-complete-propositions` | writing or editing any prose, anywhere |
| `fact-checking-by-execution` | documenting a command, default, error, or install path |
| `trimming-session-vantage` | prose reads like a leaked reasoning transcript |
| `proving-code-is-dead` | deleting code, or swapping in a dependency |
| `curating-decision-records` | adding, auditing, or retiring decision records |
| `reviewing-as-cis-complement` | reviewing a change, or answering review |
| `pushing-safely` | pushing, force-pushing, or checking whether it landed |
| `recording-ui-evidence` | recording a UI demo as visual evidence |
| `validating-real-scenarios` | accepting against a real deployment, or a report that it drifted |
| `metabolizing-knowledge` | asking whether something delivered earlier still holds |

![Where each skill sits in one iteration: an entry router, six numbered stages from qualifying a request through curation, and two skills that apply at every stage.](assets/loop.svg)

## The seven rules

These sit under all twenty-two. The longer argument is in [docs/method.md](docs/method.md).

1. **Narrowest sufficient evidence.** Run the check that would actually fail. Never the full suite by reflex.
2. **Never fake a green.** No suppressing empty results, no lowered thresholds, no narrowed scope to hide a file.
3. **Return the budget; do not invent headroom.** Restoring a limit already granted is not masking. Widening an unexamined wait is.
4. **Brevity is not the goal.** A smaller word count alone is not an improvement.
5. **No quotas.** Age, length, and count are discovery aids, never criteria.
6. **A green signal is not evidence.** Coverage is not correctness. A passing rerun proves nothing. A queued merge is not a landing.
7. **A mechanism's existence is not a reason to use it.** Tools invite the work they are capable of.

Most contributor guides say the opposite of several of these. They tell you to run everything, keep everything, and shorten everything — each a reflex standing in for a judgment.

## The adapter is not an adoption gate

No skill here names a command, because a skill that hardcodes `run-the-tests` goes stale the moment the project moves — silently, since nothing checks prose. Project-varying values live in one file at your repository root, `.ledger.yml`, written by `adapting-to-a-project`, which runs each command before recording it.

**Most of the skills never read it, and none of them wait for it.** Only a skill that has to *run* something stops on a missing value, and it stops by naming the value it needs. A missing `.ledger.yml` is a convenience not yet taken, never evidence that these disciplines do not apply here.

## Measured, including where it disappointed

The pack ships [15 eval cases](evals/README.md), each with a real fixture and an outcome grader that asks whether the answer contained what a user would notice the absence of — not merely whether a skill loaded.

The most useful thing they produced was three retractions. Three times a board was published showing a large gain from the always-on router hook, and three times reading the runs behind the numbers showed the gain was an artefact — missing fixtures, runs truncated at a limit scored as wrong answers, and ten runs that never reached the model at all. **Every one of the three errors flattered this pack.** A clean board finds no detectable benefit from that hook, which is why the README no longer claims one and [docs/method.md](docs/method.md) says how to switch it off.

That is the standard this pack asks of you, applied to itself.

## What this is not

- It does **not** prescribe a development workflow. No brainstorm-then-spec-then-implement loop.
- It does **not** choose your architecture, language, or tooling.
- It does **not** generate code.

It governs what the codebase and its records must be able to prove. That composes with whatever workflow you already use.

## Contributing

Rules are mostly enforced rather than written down: `npm test` runs the drift gate over the whole corpus, and `npm run test:self` plants defects and proves it rejects each one. Both are free and both are what CI runs. [CONTRIBUTING.md](CONTRIBUTING.md) covers the few rules a check cannot state.

## Attribution and license

MIT. Derived in part from the agent-instruction corpus of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), which is MIT-licensed. The upstream notice is preserved in [NOTICE](NOTICE); this project's terms are in [LICENSE](LICENSE).

Star ⭐ if it saved you one "verified and working" that wasn't.
