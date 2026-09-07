---
name: reviewing-as-cis-complement
description: Use when reviewing a change request or a diff, when asked for a code review, or when responding to review feedback on your own change. DO NOT invoke to compute what a change touches — route that to ledger:scoping-a-change. DO NOT invoke to judge what a green check proves — route that to ledger:what-counts-as-evidence.
---

# Reviewing as CI's complement

**This is guidance, not a complete checklist.**

A review's value is entirely in what the automated checks cannot show. Anything a green check already enforces costs the author nothing to fix and costs the reader attention to read, so write the review as the **complement** of CI — which means a good review guide shrinks over time, as its rules become mechanical.

Start from a verified scope (`ledger:scoping-a-change`) and read enough surrounding code to understand the design, not just the diff. Prioritize correctness, lifecycle, security, and broken required behavior over style. **A short review with one substantiated blocker is better than a list of nits.**

## Interfaces and consumers

- **Trace both sides of every changed interface.** Confirm the implementation matches what the change claims, including errors, cancellation, ownership, and disposal. A diff shows one side; the contract lives in two.
- **Trace every current consumer**, then flag consumer-specific behavior leaking into a shared interface.
- **Flag the inverse too**, because it is the one reviewers miss: a new public method on a generic service whose only caller is one internal consumer is unnecessary API expansion. The fix is a private capability handed to that consumer at construction, not a public method everyone now has to reason about.
- **Scope, ownership, necessity:** map each abstraction, state machine, option, defensive copy, and compatibility path to its current contract, its production consumer, and its owning component. Challenge unrelated features and speculative generality.
- **Public choices need evidence:** ask what current-consumer evidence or prior art supports each default, public operation set, format, or imported external concept. Where that evidence is absent, require an explicit choice or an explicit deferral — not silence.

## Lifecycle and concurrency

For asynchronous setup, callbacks, processes, or teardown, check specifically for: races before publication; cancellation arriving mid-await; independent error reporting; callback containment; ownership established before re-entry; complete detach on cleanup; and disposal that waits for quiescence rather than merely signalling.

- **Borrowed versus owned state:** decide whether each retained value is borrowed or owned, then trace every notification, cache, prompt, echo, replay, and query view back to the documented success point and the authoritative source. A cache updated before the write is confirmed is a correctness bug that tests rarely catch.
- **Bounds must cover the final operation.** Locate the owner of the complete emitted or retained result — **wrappers and metadata included** — then probe tiny and exact limits, an oversized single chunk, and multibyte text against any byte-denominated limit. A limit applied before the envelope is not the limit that ships.

## Enforcement paths

**Follow every denial path to the operation that actually executes.** Then exercise the direct and alternate callers that can bypass a schema, a prompt, a facade, a wrapper, or a listener ordering.

A check that only runs on the path the author had in mind is a suggestion. This is where security review lives: not in whether the guard exists, but in whether every route reaches it.

## What a model or user actually receives

Where a change alters what a model or a user sees, inspect the **exact** prompts, tool schemas, results, and diagnostics across every affected mode. Flag concepts that fall outside the recipient's task.

Verify stable text verbatim and dynamic behavior through a recorded scenario. Treat wording as behavior: a changed string is a changed contract when someone downstream parses or relies on it.

## Test strength

- Assertions must **fail on the intended regression** and verify external state, logs, events, or disposal — rather than restating the implementation or trusting a component's or an agent's own report.
- **Coverage is necessary but is not evidence that the scenario is correct.**
- Tests exercise the shipped entry path — the real binary, loader, worker, or subprocess — where the change reaches it. A hand-assembled harness skips whatever the real entry does.
- A new guard needs a negative control: `ledger:proving-the-regression`.
- For a resource-owning, asynchronous, or platform-sensitive test, apply `ledger:designing-concurrent-tests` to the real worker and job topology.

## Documentation and records

- Documentation must match the code, and an operational claim needs execution behind it (`ledger:fact-checking-by-execution`).
- When a change implements a decision recorded as proposed, the record moves to implemented and is rewritten as present-tense shipped reality **in the same change** — then its paths, names, and mechanisms get verified against the implementation.
- Treat disagreement with a recorded decision as a design discussion, not an automatic veto. Records are evidence, not authority.
- Changes visible in a transcript or a recorded scenario update that recording, or explain why none applies. Review an expected-output diff as a behavior change, not as formatting noise.

## Reporting findings

State the **defect, location, impact, and evidence**. Put a localized defect inline on the tightest relevant range; use a top-level comment for cross-cutting architecture, scope, or review-wide synthesis.

Separate blockers from suggestions, and **omit issues already enforced by a green check.**

When receiving review: verify each claim, then fix it or rebut it on technical grounds. **No performative agreement** — "good catch, will fix" on a claim you have not verified wastes both people's time and often ships a worse change than the original.
