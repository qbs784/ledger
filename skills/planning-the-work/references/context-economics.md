# Context economics

The method for deriving `execution.worker_break_even_turns` and
`execution.context_ceiling` for [the site decision](../SKILL.md#where-each-unit-runs).
Both are project figures. This page is how to obtain yours; it deliberately
states no value, because a number carried in from elsewhere is a budget for a
repository that is not this one.

## The mechanism

Cost tracks **context replayed**, not output produced. Each call re-sends
everything the agent has accumulated, so within one long-lived agent:

- the price of a call grows monotonically with how long that agent has been
  running, and it never falls — nothing is released;
- total cost is therefore closer to quadratic in the number of calls than
  linear;
- and the last stretch of a long agent's life costs multiples of its first,
  for work of the same size.

A fresh agent restarts that curve near zero. It pays a fixed birth cost — its
instructions, the project's always-loaded file, its brief — and then rises from
there. It is discarded when the unit finishes, and its accumulated context
leaves with it.

**That is the whole asymmetry, and it is why the break-even is low.** Work run
on the main line does not merely cost the main line's current rate: it raises
the rate for every later turn in that session, permanently. Work run in a
worker costs the birth fee once and leaves nothing behind.

## What to compute

Read your own agent session logs. Whatever your runtime records per call, you
need four quantities:

1. **Birth context** — a fresh agent's context on its first call, by role. It
   differs: an agent given a broad tool set is born heavier than one given a
   narrow one, and that difference is paid on every one of its calls.
2. **Main-line context** — the average context of a call on the long-lived
   session, over the window you care about. This is the number that makes
   inline work expensive, and it is not stable: measure it at the point in a
   run where you would actually be deciding.
3. **Dispatch overhead** — the main-line calls spent handing work out and
   reading the result back. Count them; do not estimate them.
4. **Peak context before something goes wrong** — the size at which runs in
   your logs started getting interrupted, compacted, or truncated.

Then:

- **`worker_break_even_turns`** is the unit size at which
  `turns × main_line_context` exceeds `dispatch_overhead × main_line_context +
  turns × birth_context`. Round toward delegating: the estimate that put a unit
  inline is the one whose error is permanent.
- **`context_ceiling`** is (4), reduced by a margin. It is a guardrail, not a
  target — being under it is not an achievement, and approaching it is not a
  reason to cut work.

Record both in `.ledger.yml` under `execution`, and record the command that
produced them under `execution.cost_report` so the next person re-derives
rather than trusts.

## Two factors, not one

Cost is calls **times** context. Deriving the break-even addresses context and
leaves the other factor untouched.

The common waste in the call factor is **unbatched reading**: an agent that
issues one read at a time, each replaying the full accumulated context, to
build a picture it could have requested at once. Reads with no dependency
between them go out together. A useful diagnostic on your own logs is the ratio
of read operations to calls containing them — near 1.0 means every read paid a
full context replay for itself.

## What not to cut

The reviewing steps are the cheapest participants in a loop, because they are
short-lived and narrowly scoped. Cutting them is the intuitive economy and the
wrong one: the saving is small, and what it buys is a false green that the
following units then build on. **Cut context, not review.**

If a loop feels expensive, the question is which agent is carrying the largest
context, not which step can be skipped. Usually it is the coordinator, and
usually most of that is turns that call no tool at all.
