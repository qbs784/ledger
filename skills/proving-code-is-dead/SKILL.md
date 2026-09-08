---
name: proving-code-is-dead
description: Use when asked to find things to simplify or delete; when removing a public method, event, config option, package, or test artifact; when replacing hand-rolled code with a dependency; or when auditing defensive copies, validators, freezes, and async lifecycle machinery for speculative complexity. DO NOT invoke to retire a decision record — route that to ledger:curating-decision-records.
---

# Proving code is dead

An agent accretes speculative surface fast and evenly: an option nobody sets, an event nobody subscribes to, a validator guarding a boundary that does not exist. Each one looked reasonable when written, and each one now costs a reader's attention forever.

This skill owns the evidence standard for a removal. It does not make product decisions: a candidate with a live production caller is a feature change, and that is somebody's call rather than a cleanup.

Removing it is only safe if "nothing uses this" is **proven** rather than grepped-at. So the standard here is high on purpose: prefer a few well-proven candidates over a pile of thin guesses.

Read `protected_seams`, `source.production`, and `source.non_production` from `.ledger.yml` before you start. The seams list is what stops a confident wrong deletion.

## What counts as a strong candidate

A strong candidate removes, folds, or demotes something real, with clear evidence that the current design costs more than it buys:

- A public method, event, option, notification, helper, package, durable record, or test artifact has **no production consumer**.
- Tests or docs are the only consumers, and the behavior they pin is not load-bearing.
- Two representations mirror the same fact.
- An interface has methods every implementation must support and no consumer calls.
- A separate package exists only for test, demo, or support code, and adds publish or dependency overhead.
- A feature implements speculative generality with no product owner behind it.
- A guard, rollback path, expected-output set, or special-case test exists only to protect an unused API.
- Hand-rolled code reimplements what a well-maintained package or a platform builtin already provides, and the swap would delete the implementation *plus* its dedicated tests.
- The simplified behavior differs slightly, but the new behavior is still reasonable and easier to explain.

**Thin candidates are not enough.** Deleting one typo, running a dead-code tool once, removing a deliberately documented adapter, or flagging "this looks complex" without call-site proof — none of those clear the bar.

## Prove or reject each candidate

Classify consumers into three corpora **before** writing anything down:

- **Production:** the globs in `source.production`, plus runtime scripts and loader or configuration paths.
- **Non-production:** tests, documentation, decision records, snapshots, generated expected outputs, comments.
- **Ambiguous:** examples and scripts that might be product smoke paths. Inspect the usage before classifying — this corpus is where wrong deletions come from.

Search first, then read. Good searches include the exact symbol, the event name, the package name, the configuration key, the method name **both** as `.name(` and as `name(`, and any wire strings. Then read the call sites, the public interfaces, dynamically constructed names, tests, docs, and any configuration or plugin-loading paths.

[references/consumer-probes.md](references/consumer-probes.md) carries the battery: a probe per referent kind, the invocation rules that decide whether a result means anything, and the consumer families — reflection, string-keyed dispatch, declarative wiring, serialized data, cross-repository callers — that no text search can reach. **A zero-hit search is not evidence until the pattern has matched a known positive.**

Reject or downgrade a candidate when:

- a production caller exists, and removing it would be a **feature decision** rather than a cleanup;
- the API is explicitly justified by a recorded decision or a hard-won defensive pattern, and your new evidence does not beat that reason;
- removal would force unrelated churn without actually reducing the public API or the required behavior;
- the idea is correct but tiny — leave a targeted marker instead (see below).

## Audit trust and lifecycle boundaries

This is where the richest findings are, and it needs its own pass.

For every defensive copy, freeze, validator, and callback capture, **name where the value came from and who owns it next.** Same-process typed calls ordinarily borrow read-only values. Parsers, configuration loaders, queues, model and tool JSON, durable files, workers, processes, and wire decoders own or validate their data. The distinction decides whether a guard is protecting anything.

Tests built around hostile getters, fake typed objects, callback replacement, or mutation after a same-process handoff are **evidence of a possibly speculative contract**, not automatic justification for keeping it. A test can be the only reason a guard looks necessary.

For complex asynchronous code, draw the ownership graph: map each sentinel, readiness promise, cancellation path, disposer, and state flag to a distinct owner or transition. When several mechanisms mirror the same liveness or settlement fact, propose one controller instead of many.

Preserve separate machinery where it genuinely protects synchronous publication and rollback, callback containment, first-terminal-outcome arbitration, worker or process ownership, or dispose-to-quiescence. These look redundant and are not.

## Hand-rolled code versus a dependency

Introducing a dependency is a valid simplification move, not a policy exception. When surveying protocol parsers, framers, retry and backoff loops, glob matchers, diff engines, and similar infrastructure, ask: does a well-maintained package or a platform builtin already do this?

Prove such a candidate like any other, plus:

- Read the hand-rolled implementation and name the **exact** surface the package covers. Residual semantics the package does not cover count against the swap and stay in the proposal.
- Check the package's health honestly — maintenance, adoption, transitive footprint — and prefer a builtin when one exists at your supported platform floor.
- Check the recorded decisions first. A seam with recorded rationale is settled; a swap that collapses it must beat that rationale, not merely cite a preference for dependencies.
- **Weigh net deletion:** implementation, plus dedicated tests, plus docs, minus the glue that remains. **A wrapper that relocates the same complexity is not a win.**

## Survey discipline

Sweep by domain, largest production-code delta first. **Do not let the first good candidate stop the survey**, and do not expand a narrow survey into a repository-wide audit because you noticed something adjacent.

**Record the losing verdicts too.** A candidate you investigated and rejected, with the reason, is what stops the next survey from re-running the same investigation from scratch.

## Small and local: use a marker

For a cleanup that is clearly useful but not a durable design decision, leave an inline marker rather than a proposal:

- name the smell with a stable tag, so it is searchable;
- say why it is safe to revisit and what action would simplify it;
- **do not add a marker for a speculative complaint**, or for behavior that needs a real decision.

## Write it up

For each surviving candidate state: the current API and where it lives; the consumer evidence, with production callers separated from non-production ones; exactly what to remove, fold, demote, or rehome — including tests, docs, and generated files; the strongest counterargument, honestly made; the observable end state; and the risks, including public API and behavior changes.

Be concrete enough that an implementing change can follow the trail. Avoid vague "simplify this area" proposals — they are indistinguishable from having not done the work.

If your project keeps durable decision records, check `records.required_sections` in the adapter and match the format it names. A proposal written to a shape the project's own checks reject is wasted work.
