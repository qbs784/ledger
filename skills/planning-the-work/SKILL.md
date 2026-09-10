---
name: planning-the-work
description: Use when a plan, unit breakdown, task list, or milestone list is in hand and work is about to start against it — including when asked whether to begin the first unit. Also use when turning an approved approach into units. DO NOT invoke to decide whether the work is worth doing at all — route that to ledger:qualifying-a-request. DO NOT invoke once a unit is underway and the question is whether it is finished — route that to ledger:running-a-bounded-loop.
license: MIT
---

# Planning the work

Splitting work into units answers **what** gets built. It does not answer how
the pieces run, and the second question is where a plan actually fails: units
sized well, ordered by nothing, each started wherever the last one finished.

This skill owns one artifact — **the table** — and the criterion for it being
settled. It does not run a unit, and it does not decide whether the work
should exist.

## Find the plan before asking for it

A request saying the breakdown is here almost always means it is in the
repository — a plan document, a milestone list, an issue body — and the first
move is to go and read it. Asking whoever sent you to paste what is already on
disk spends their turn and reports an absence you never checked.

If it genuinely is not there, say **where you looked** before saying it is
missing. An unchecked absence and a real one read identically, and only one of
them is a finding.

## The table

One row per unit. Every column is required before any unit starts.

| Column | What it holds |
|---|---|
| **unit** | a stable identifier other rows can depend on |
| **deliverable** | what exists at the end that did not before |
| **tier** | which tier of `ledger:qualifying-a-request` this unit is, decided per unit rather than inherited from the request |
| **site** | where it runs: on the main line, or delegated to a fresh worker |
| **depends_on** | the units that must finish first — an explicit empty list when none |
| **acceptance** | the criteria this unit satisfies, by reference |
| **verifier** | the check that would fail if this unit were wrong |

**`depends_on` is not documentation.** It is the only input that lets units run
in parallel waves, and an omitted edge is indistinguishable from no dependency,
so the whole plan degrades to a single serial chain. Writing an empty list is
the assertion that you checked.

**The tier is decided per unit.** One approved request routinely contains a
unit that touches a published contract and another that does not, and treating
the whole request as one tier gives the contract-bearing unit no baseline.

## Four questions the table has to answer

Each gets a written conclusion. Silence is not a pass — three of these fail by
looking fine.

1. **Can it be demoted?** After a neighbouring unit is settled, is there
   anything left here? A unit whose remainder is one assertion belongs to that
   neighbour as an acceptance criterion, not as a unit with its own gate.
2. **Should it be split?** A unit holding two things that pass their gates
   independently is two units. The cost shows up on failure: a rejection sends
   back everything in the unit, including the part that was right.
3. **Should it be merged?** Small units of the same shape, over the same code,
   behind the same verifier, are one dispatch. Each unit carries a fixed
   overhead — its own plan, its own gate, its own review — and that overhead
   does not shrink with the unit. **Merging has a ceiling**: read
   `execution.context_ceiling` from `.ledger.yml`, and do not merge past it. A
   run that overruns gets interrupted and finished by a second worker, which
   costs more than the merge saved.
4. **What collides?** Walk `depends_on` and place each unit in a wave. Then ask
   separately, because it is a different question: **within one wave, do two
   units modify the same thing?** Ordering by dependency does not prevent
   collision, and the pair that collides is usually not the pair the dependency
   graph made you look at.

**Do not answer these four alone.** Whoever drew the units cannot see where the
lines are wrong; the reader who can is the one who just finished a unit under
them. Re-check the table after the first wave lands, or hand it to a reader
with no history in it.

## Where each unit runs

The choice is between the main line and a fresh worker, and it is a cost
decision with a break-even, not a style preference.

- A fresh worker starts near empty, does the unit, and is discarded. Its
  context never returns.
- A unit run on the main line leaves its whole working context there
  **permanently**, so it raises the price of every later turn in the session,
  not only its own.

That asymmetry is why the break-even is low: past a handful of turns,
delegating is cheaper even before the residue is counted. Read
`execution.worker_break_even_turns` from `.ledger.yml`; below it keep the unit
inline, at or above it delegate. **Derive that number from this project's own
logs** — [references/context-economics.md](references/context-economics.md)
gives the method, and a figure adopted from elsewhere is a budget for someone
else's repository.

The failure in the other direction is real and has one cause: a delegated unit
that was briefed badly goes confidently the wrong way, and nobody sees it until
the report. Delegating more means the brief carries more —
[references/dispatch-brief.md](references/dispatch-brief.md) is what a brief
has to contain and what comes back.

**Budget the coordinator too.** The role that dispatches, reads reports and
updates the table sits on the longest-lived context in the session, and is
routinely the most expensive single participant — most of that in turns that
call no tool at all. Write down what it will and will not do: dispatch, check
summaries, re-run the cheap deterministic checks, keep the table current.
Everything else is delegated, including thinking out loud.

## When the plan looks done and is not

| The thought | What is actually true |
|---|---|
| "Dependencies are obvious from the order I listed them in." | An order is not a graph. Nothing can compute waves from it, so everything runs serially and the plan silently costs what the longest chain costs. |
| "I will decide where each runs when I get there." | By then the expensive units have already run wherever the previous one ended, which is the main line. The choice is only available before. |
| "These two are tiny, so merging them is free." | Merging is free until the merged run crosses the ceiling, and past it you pay for an interrupted run plus a second worker. Check the ceiling, not the size. |
| "I checked dependencies, so collisions are covered." | Different question. Two units with no dependency between them are exactly the pair most likely to land in the same wave and edit the same function. |
| "The table is mine to review — I wrote it." | You cannot see the line you drew wrong. The four questions are answered honestly only by someone who did not draw them. |
| "This unit is small enough to skip the verifier column." | Then nothing would go red if it were wrong, and its gate is a formality. A unit with no verifier is not small, it is unguarded. |

## Report

The table, complete. Then: the conclusion you reached on each of the four
questions, the wave assignment with the collision check stated separately from
the dependency check, and any column you left empty with the reason. An empty
column is a decision deferred to whoever starts that unit, and they will make
it without the context you had.
