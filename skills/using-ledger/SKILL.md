---
name: using-ledger
description: The map of this pack — the seven rules, and which discipline to reach for at each stage of a change.
disable-model-invocation: true
---

# Using ledger

Ledger is the operating discipline for a codebase worked on over a long horizon: hundreds of turns, thousands of changes, across sessions that share no memory. At that scale the thing that kills a project is not a bad commit — it is silent rot. Prose stops describing the code, rules go unenforced, dead surface becomes undeletable because nobody can prove it is dead, and claims pile up that nobody can check.

Every skill here exists to keep one of those from happening. This one tells you which to reach for.

## The seven rules

These compress most of the pack. They are worth holding in view even when no skill is loaded.

1. **Narrowest sufficient evidence.** Run the check that would actually fail. Never the full suite by reflex.
2. **Never fake a green.** No suppressing empty results, no lowered thresholds, no narrowed scope to hide a file.
3. **Return the budget; do not invent headroom.** Restoring a limit that was already granted is not masking. Widening an unexamined wait is.
4. **Brevity is not the goal.** A smaller word count alone is not an improvement.
5. **No quotas.** Age, length, and count are discovery aids, never criteria.
6. **A green signal is not evidence.** Coverage is not correctness. A passing rerun proves nothing. A queued merge is not a landing. A zero-hit search proves nothing until it has matched a known positive.
7. **A mechanism's existence is not a reason to use it.** Tools invite the work they are capable of.

And the one that subsumes several of them: **verify the world, not the self-report.** A keyword probe on a worker's own output lets a worker that did nothing pass by claiming success.

## Before you start working

Measured, not assumed: given a realistic prompt in a session with a full tool
set, this pack's skills often did not load at all — and in every one of those
runs nothing else loaded either. The model simply began working. The first move
was `ls -la`.

That is not a neutral outcome. It means the discipline that would have applied
was never in view, and the work proceeded on whatever the model already
believed. **The pull toward starting is strongest exactly when a rule would
have changed what you did.**

| The thought | What is actually true |
|---|---|
| "Let me look around first, then decide." | Looking around *is* the work, and it is already governed. `scoping-a-change` exists because the base you infer from a directory listing is wrong for a fresh branch, a stacked branch, and any branch after a merge. |
| "This one is simple enough to just do." | Simple tasks are where a rule is cheapest to follow and least likely to be followed. The expensive ones get attention on their own. |
| "I'll check the discipline once I know what I'm dealing with." | By then you have chosen an approach, and the rule now reads as an objection to your own plan rather than as guidance. |
| "I know this rule already." | Knowing it is not the failure mode. Every rule in the seven above is one a competent engineer already agrees with, and the pack exists because agreement does not survive contact with a deadline. |
| "No skill obviously matches." | Then the answer is in the table below rather than in your first instinct. If it is genuinely not here, say so — that is a finding about this pack. |

Reaching for the wrong one costs a few seconds. Reaching for none is how a
change lands with nothing behind it.

## Where to reach for what

| When you are… | Load |
|---|---|
| starting in a new repository, or a skill reports a missing adapter value | `adapting-to-a-project` |
| about to state that something works, passes, is covered, or is done | `what-counts-as-evidence` |
| choosing which checks to run, or about to repeat one that passed | `refusing-busywork` |
| working out what a change actually touches | `scoping-a-change` |
| adding a guard, rule, or validator; asserting a fix works | `proving-the-regression` |
| writing or reviewing a test that touches ports, files, env, clocks, or teardown | `designing-concurrent-tests` |
| investigating a test that fails intermittently | `diagnosing-flakes` |
| writing or editing any prose, anywhere | `writing-complete-propositions` |
| documenting a command, default, error, or install path | `fact-checking-by-execution` |
| cleaning prose that reads like a leaked reasoning transcript | `trimming-session-vantage` |
| deleting code, or replacing hand-rolled code with a dependency | `proving-code-is-dead` |
| adding, auditing, or retiring decision records | `curating-decision-records` |
| reviewing a change, or answering review on your own | `reviewing-as-cis-complement` |
| pushing, force-pushing, or checking whether something landed | `pushing-safely` |
| recording a UI demo as visual evidence | `recording-ui-evidence` |

Load more than one when more than one applies. They are written to compose, and each names the boundary where it hands off.

## The five pillars

If you want the shape rather than the index:

1. **Documentation is the substrate, not the byproduct.** For a human team docs are a courtesy; for an agent they are the working memory. Every fact gets one home, and a rule that becomes mechanical is promoted into a check and *deleted* from the prose. — `writing-complete-propositions`, `fact-checking-by-execution`
2. **Agent-native by construction.** Written for the case where a model is the author, which changes what the failures are: prose carries the authoring session's viewpoint, speculative surface accretes fast and evenly, and the worker will report success. — `trimming-session-vantage`, `what-counts-as-evidence`, `proving-code-is-dead`
3. **Loop engineering: each iteration cheap and true.** A long-horizon loop dies of wasted turns. Verified bases, narrowest checks, no ceremony. — `scoping-a-change`, `refusing-busywork`
4. **Long-horizon automation needs a durable record.** A reader 500 turns later must resolve every reference and re-derive every decision. — `curating-decision-records`, `recording-ui-evidence`
5. **Rot resistance as a build requirement, not a cleanup task.** Pin the absence of dead values so a stale reference fails a check instead of aging quietly. Prove code is dead before deleting it. — `proving-the-regression`, `designing-concurrent-tests`, `diagnosing-flakes`, `reviewing-as-cis-complement`, `pushing-safely`

## Setup

No skill in this pack names a command. Project-varying values — test lanes, CI ownership, hooks, source globs, protected designs — live in `.ledger.yml` at the repository root, and the skills read it.

If that file does not exist, start with `adapting-to-a-project`. If it exists but a value you need is `null` or listed under `unverified`, say so and stop rather than guessing: a wrong command is worse than a missing one, because it runs and produces a result you will believe.
