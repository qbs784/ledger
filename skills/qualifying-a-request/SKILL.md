---
name: qualifying-a-request
description: Use when a request for new work arrives — a feature, a capability, an idea, a leftover being escalated — and before any design, plan, or implementation exists for it. Also use when work already underway turns out to be larger or different than what was agreed. DO NOT invoke to choose which checks to run once the work is underway — route that to ledger:refusing-busywork. DO NOT invoke to work out what a change touches once it is decided — route that to ledger:scoping-a-change.
license: MIT
---

# Qualifying a request

Two questions arrive together and are not the same question: **should this
exist**, and **how much process does it earn**. A pack that answers only the
first produces ceremony nobody finishes. A pack that answers only the second
builds the wrong thing efficiently.

This skill owns both. It does not design the thing, and it does not decide
which checks the resulting work runs.

The failure it exists to stop is the one that costs the most and is hardest to
see afterwards: implementation began, and the request was never interrogated,
so the work is correct against an intent nobody wrote down.

## What the request earns

Four tiers. Ask in order and stop at the first match — the order is what keeps
a contract-bearing change from being classified as small because it looks
small.

| | The request | What it earns |
|---|---|---|
| 1 | **An existing consumer contract must survive it** — a published interface, an internal call surface, a data format, an event shape, an assertion someone else relies on | A recorded baseline **before** anything is touched. The criterion for this work is whether the contract broke, not what value was delivered, and that criterion is unavailable once you have already edited |
| 2 | **Same-shape, low-semantics, and a binary verifier already exists** — one command that answers pass or fail over the whole set | The verifier is the intake. Do not write a design; establish that the verifier rejects a known-bad member, then run the change against it |
| 3 | **No new interface, no new dependency, and no acceptance assertion changes** | Nothing. Do it. `ledger:scoping-a-change` and `ledger:refusing-busywork` govern the rest |
| 4 | Everything else — something must be **defined**: a criterion, a semantic, a shape, or an answer to "is this number trustworthy" | The full intake below |

**Tier 1 is judged on whether a contract exists, not on whether behavior
changes.** Consolidating an interface changes behavior on purpose; judging by
"is the behavior the same" routes exactly the changes that most need a baseline
into the tier that has none.

**Size is a discovery aid, not a criterion.** A large diff across one surface
is tier 3 if it introduces no interface and moves no assertion. A three-line
edit to a published error string is tier 1.

**The ratchet is one-way.** Hidden complexity found mid-work raises the tier —
stop, say so, and re-qualify. Nothing lowers it. "I am nearly done" is the
moment the rule is worth the most and is followed the least.

## The full intake

Four questions. Each is answered with evidence or marked as unanswered; a
comfortable answer means the question was not pushed.

1. **Who is blocked right now.** Which consumer, module, or scenario is stuck
   on this *today*, and what is the strongest evidence — a behavior, a payment,
   a leftover that keeps recurring. "It seems useful" is the absence of an
   answer, not a weak one.
2. **What they do instead today, and what that costs.** A request with no
   workaround is either urgent or imaginary, and the difference shows here.
3. **Who consumes the result**, named. What they get, and what specifically
   hurts without it.
4. **The smallest version that delivers value on its own** — not the first
   slice of an eventual whole. If no such version exists, that is a finding
   about the request.

Then the approaches. **At least two, and verified rather than recalled** — what
already exists for this, who uses it, what it would cost to adopt. An approach
you remember is a hypothesis; `ledger:fact-checking-by-execution` is the
standard the verification is held to, and it applies to a claim about the
outside world exactly as it applies to a claim about this repository.

Recommend one, and **tag each reason as driven by the need or driven by the
implementation.** Capture the reasons now: reconstructed afterwards they are
reliably wrong, because the reason that actually decided it is the one nobody
writes down. Where the choice is architectural, it becomes a record —
`ledger:curating-decision-records` owns the form, and a record that names only
what was chosen, and not what was rejected and why, is half a record.

## When you are about to skip this

| The thought | What is actually true |
|---|---|
| "This one is obvious — I will just build it." | Obvious describes your model of the request, which is the thing that has not been checked. Tier 3 exists for genuinely small work and is decided by structure, not by how clear it feels. |
| "It is small, so it is tier 3." | Tier 3 is three structural tests, and none of them is size. Run them. A small edit to a contract is tier 1. |
| "Interrogating this is heavier than doing it." | Then it is tier 3 and the intake does not apply. If it is not tier 3, the comparison is against the rework, not against the build. |
| "There is only one sensible approach." | State it as the recommendation and name the one you rejected. If you genuinely cannot name a second, that is worth one sentence — it is usually where an assumption is hiding. |
| "They asked for it, so the value question is answered." | A request names a solution. The four questions ask what it is a solution *to*, and the answer regularly changes the solution. |
| "It grew, but re-qualifying now wastes the work already done." | Sunk work is not evidence about the tier. Work done under the wrong tier is the cost you are trying to stop adding to. |

## Report

State the tier and which test decided it. For a full intake: the four answers
with the evidence behind each, the approaches with the recommendation and its
tagged reasons, and every question you could not answer — an unlisted gap reads
as an answered one.

An unqualified request that proceeds anyway is a decision too. Say that it was
made and who made it.
