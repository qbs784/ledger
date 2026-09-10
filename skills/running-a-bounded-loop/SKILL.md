---
name: running-a-bounded-loop
description: Use when carrying one planned unit of work through to done; when defining what a unit's exit gate has to contain before it can be called finished; or when an unattended run has to decide whether to stop and ask. DO NOT invoke to arrange units, order them, or choose where each runs — route that to ledger:planning-the-work. DO NOT invoke to write the criteria that define done in the first place — route that to ledger:specifying-acceptance.
license: MIT
---

# Running a bounded loop

A unit is bounded when three things are true of it: it can be **verified** on
its own, **rolled back** on its own, and **resumed** from its last green point
by someone who was not there. A unit missing any of the three will be reported
as finished on the strength of how much work went into it.

This skill owns the criterion for one unit being finished. It does not decide
what the units are.

## The loop

1. **Write the test plan first, and commit it on its own.** What will be
   verified, and how, decided before there is an implementation to be
   influenced by. The criteria it verifies come from
   `ledger:specifying-acceptance`; a plan that restates them without naming the
   assertion for each has not started.
2. **Implement in steps that can be bisected.** One concern per commit. The
   point is not tidiness — it is that a failure three units later has to be
   attributable to a step.
3. **Test, then classify what the results say.** Every surprise is one of
   three things: the implementation is wrong, the test is wrong, or the plan
   was wrong. Naming which one is the output of this step. Silently fixing the
   test is how the third case disappears.
4. **The exit gate**, below. All of it green, or the unit is not finished.
5. **Report**, including the decisions taken inside the unit that the plan did
   not anticipate.

## The plan gate is where the cheap findings are

Before the first line of implementation, an **independent** reader — not the
one who will implement it — reads the test plan and answers whether each
assertion could fail.

This is the highest-leverage step in the loop and the most frequently skipped,
because at that moment there is nothing to look at but a document. The
arithmetic is not close: a defect found here costs an edit to a few lines of
markdown. The same defect found after implementation costs the implementation,
the review, and the rework — and it is the same defect either way, because the
things that go wrong at this layer are visible in the plan. An assertion that
only proves a call happened, a lock whose scope is wrong, a criterion with no
way to measure it: all of them are legible before any code exists.

What to ask is the six-question list and the twelve shapes in
`ledger:proving-the-regression`. Any question with no answer sends the plan
back. Implementation does not start on a plan with an open question.

## The exit gate

Four parts. The deterministic ones are the hard gate; the judgement ones cannot
be replaced by them.

- **The deterministic checks this change actually reaches.** Which ones is
  `ledger:refusing-busywork`'s decision, not a fixed list, and the skipped ones
  are named with the reason.
- **An independent review** — `ledger:reviewing-as-cis-complement`. The
  implementer's own review is a different artifact and does not substitute:
  whoever wrote the code cannot stop seeing the intent behind it.
- **Documentation against code.** Every claim the unit's prose makes about
  behavior, checked against the behavior. `ledger:fact-checking-by-execution`
  is the standard.
- **The decisions taken along the way, read against the approved approach.**
  Individually each is reasonable; the failure is cumulative. Three sensible
  local calls can land a unit somewhere the approach never went, and the only
  moment anyone can see it is with the list in hand at the close. Drift large
  enough to change an interface becomes a record — `ledger:curating-decision-records`.

Two mechanics that decide whether the gate is real:

- **Run a long check in the background and read its summary line.** A single
  long foreground command gets killed by the harness, and the kill looks like a
  failure of the thing under test.
- **Never let a pipe eat the exit code.** A command whose output is piped
  reports the pipe's status. This has produced reports of a green run over a
  log whose own last line was an error.

## Attended and unattended

**Attended:** a person confirms at each unit boundary. Correct for high-risk
work and for the first unit of anything new.

**Unattended:** the loop continues through unit boundaries on its own. This
only works if what may stop it is decided in advance, because in the moment
every question looks worth asking.

These do not stop an unattended run, and stopping on them is the common failure:

1. **A push failed.** The commits exist locally. Continue; publish at the end.
2. **Whether to integrate now.** An unattended run's integration unit is the
   whole batch. The question does not exist at a unit boundary.
3. **Whether to continue to the next unit.** The scope you were given is the
   answer.
4. **A review finding whose fix is unambiguous.** Fix it and continue.
5. **A local tradeoff inside the unit** — a name, a split, a test's grain.
   Decide it and record it in the report.

**What does stop it:** a blocker whose radius is every remaining unit, or a
deterministic check that is red and that you cannot fix.

The rule underneath: **how to ask is a separate question from whether to ask,
and having a good channel for questions never lowers the bar for raising one.**
Treating the first as the second manufactures questions in order to route them
somewhere.

## Integrate the batch, not the unit

An unattended run integrates once, at the end. Per-unit integration leaves the
trunk holding **half a capability** — the unit passed its own gate, and the
capability it belongs to has no consumer yet and no closing documentation. An
unattended run is by definition one where nobody is present to judge whether
that intermediate state is acceptable, and it is exactly where an interruption
leaves things.

Per unit, still: a clean commit, a marker at the green point, and absorb the
trunk into the work branch. Publish, and integrate, once.

A unit may be integrated early when it is **semantically self-contained** — no
later unit depends on its output, it leaves no half-delivered promise, it can
be reverted alone — **and** something outside is waiting for it. Say so in the
report. A green gate is not the reason: green says the unit is right, not that
the batch is coherent without the rest.

## When you are about to call it done

| The thought | What is actually true |
|---|---|
| "The plan gate is ceremony — there is nothing to look at yet." | That is the property that makes it cheap. The defects it catches are legible in the document, and every one of them costs the whole implementation to find later. |
| "I reviewed my own work carefully." | Carefully is not the variable. You cannot un-see the intent, so the review that matters is the one by a reader who never had it. |
| "The suite is green, so the unit is done." | Green is the deterministic part of one of four gates. It says nothing about the drift check, the docs, or whether any of those assertions could fail. |
| "The test was wrong, so I fixed the test." | Sometimes true, and it is the classification that has to be stated, not the edit. An unstated one is indistinguishable from moving the bar. |
| "This decision was too small to record." | Each of them was. The gate reads the list, not the entries, and the list is the only place cumulative drift is visible. |
| "It is unattended, so I should ask before doing anything surprising." | The list above is what may stop the run. Anything else, decide and record — a run parked overnight on a question costs more than a recorded wrong call. |

## Report

What ran and what it printed. The three-way classification for each surprise.
The decisions taken inside the unit, with what each would cost if wrong. The
gate parts that passed, and any that were skipped with the reason.

A unit reported as finished with a gate part unstated reads as one where every
part passed.
