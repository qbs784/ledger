---
name: validating-real-scenarios
description: Use when something is being accepted against a real deployment for the first time, when someone reports that delivered behavior is wrong or has drifted, on a periodic health check, or when the question is whether a thing works rather than whether its tests pass. DO NOT invoke to judge what an already-green check proves — route that to ledger:what-counts-as-evidence. DO NOT invoke to carry one unit of work to its exit gate — route that to ledger:running-a-bounded-loop.
license: MIT
---

# Validating real scenarios

Tests cover the contracts someone knew to write down. A whole story driven
through the shipped interfaces is what exposes the ones nobody knew about —
the two components that each behave correctly and disagree about a format, the
step that works in isolation and not third in a sequence.

This skill owns which signal counts as a user-visible one. It does not judge
what a green check proves in general, and it does not run a unit's exit gate.

**"The suite is green" and "the product works" are different claims.** Only one
of them has been observed at the end of a unit of work, and it is not the
second one.

## Through the shipped interfaces, on a production-shaped instance

`scenarios.stand_up`, `scenarios.suite` and `scenarios.permitted_entries` in
`.ledger.yml` name how this project stands an instance up and what it drives.
**Standing one up** stops on a missing value — say which one, because a
scenario run against the wrong thing produces a green nobody can interpret.

**Reading a suite that already exists stops on nothing.** Whether its steps go
through a real entry, and whether its assertions could fail, is legible in the
suite itself, and that reading is most of this skill.

- **The instance is shaped like production, and is not production.** Same
  interfaces, same wiring, same startup path.
- **Every step goes through a permitted entry.** A direct write to the store, a
  call into an internal function, a fixture that seeds state the product cannot
  reach — each of those proves something about the code and nothing about the
  product. The back door is the single most common way a scenario passes while
  the story is broken.
- **Start from zero.** A story that only passes against state left behind by a
  previous run has not been validated; it has been observed once, in conditions
  you cannot recreate.

## Two modes, different questions

**First acceptance — is this story finished?** One scenario at a time: take the
acceptance criteria that already exist for it (`ledger:specifying-acceptance`
owns their form), write the run, drive the whole story through the real
interfaces, fix what breaks, and only then declare. Done means **both** a fresh
path and the existing suite pass against the instance. One of the two is not a
result.

**Operational regression — does it still work?** Driven by a real request in
someone's own words rather than by a test plan. Turn it into a question with an
expected answer, run it through the real interface, compare, locate, fix,
re-run, and close the loop back on the original words. Triggered by a report, by
a delivery worth checking, or by a schedule.

## The enemy is declaring it done early

This is the failure mode this skill exists against, and it does not feel like
one — it feels like finishing. Before declaring, read your own run adversarially:

- **Is every claim the implementation makes covered by a step that passed?** Not
  by a step that ran.
- **Does anything assert on a value it wrote itself a moment earlier?** That is
  a cache reading its own echo, and it passes under an implementation that never
  persisted anything.
- **Would this assertion pass if the order happened to be right by accident?**
  An assertion on where something appears, rather than on the field that
  carries the meaning, is satisfied by luck. Consume the machine-readable field.
- **What did not run?** A scenario suite reports what it covered. The gap
  between that and the story is where the next report comes from.

`ledger:proving-the-regression` carries the catalog of shapes a check takes when
it cannot fail; the twelve apply here with more force than anywhere, because a
scenario is expensive enough that nobody wants to hear it was decorative.

## Verify, then fix, then verify again

A failure is not a fix instruction. Before touching anything, state the symptom,
what kind of cause it is, the options you considered, and what else the cause
reaches — that last one decides whether this is one fix or several.

Then: fix and test as separate commits, and **re-verify on a rebuilt instance**.
A patch applied to the running instance and never reproduced from scratch is a
result you cannot ship; the rebuild is what distinguishes a fix from a
workaround that happens to be in place.

## When to stop

All steps passing is the finish. Otherwise:

- The same step failing after five rounds, or two rounds with no change in what
  fails, is not a fix loop any more. Record it and move on rather than paying
  the same round again.
- **A transient failure is not a result.** A network timeout, an exhausted
  quota, a service still starting — back off, resume from the last passing step,
  and do not record it as a scenario failure. Nor as a pass.

A validated story is worth keeping validated: it becomes the baseline that
`ledger:metabolizing-knowledge` re-verifies once it can go stale without anyone
noticing.

## Report

The stories you drove, the entry each went through, and what passed. Then the
adversarial pass above, answered. Then what you did not cover, named — a
scenario report that lists only what it exercised reads as a claim about the
whole product.
