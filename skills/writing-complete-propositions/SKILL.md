---
name: writing-complete-propositions
description: Use when writing, editing, trimming, restoring, or reviewing prose anywhere in a codebase — code comments, docstrings, module headers, READMEs, guides, decision records, prompts, diagnostics, CLI and UI strings — and when deciding whether a passage needs prose at all. DO NOT invoke to hunt reasoning-transcript residue specifically — route that to ledger:trimming-session-vantage.
---

# Writing complete propositions

Write enough to preserve the obligation, then remove the repetition and decoration. Both halves are the job: this is not a one-way shortening pass, and **a smaller word count alone is not an improvement.**

An obligation here means a precondition, postcondition, invariant, compatibility promise, or failure guarantee that a caller, callee, implementer, producer, or consumer relies on. That is the thing prose exists to carry, and the thing an edit can silently destroy.

## Inputs and scope

- **Require an explicit scope.** If you were not given one, report what input is needed and stop. Do not infer a repository-wide scope and do not start an interview.
- **Mode is separate from write authority.** Working automatically means not asking questions; it does not mean being allowed to edit. Confirm both.
- **Exclusions go last** in any search, so a later include cannot re-admit them. Exclude vendored third-party code and any frozen archive. If the scope contains only excluded paths, report that no eligible files remain rather than widening it.
- **Derivative artifacts are not prose targets.** Generated catalogs, recorded fixtures, and snapshots get fixed at their source and regenerated.

## Preserve the complete proposition

Before editing, identify every proposition in the passage. Preserve each relevant one:

- actor and action;
- condition, timing, and ordering;
- modality — must, may, never;
- negative guarantee and exception;
- ownership, side effect, failure mode, and consequence.

Remove adjectives, repetition, and narration **only when every factual clause survives and the result is clearer.**

Keep a complete local contract at the point of use: the behavior, failure, ownership, and consequence a caller or maintainer needs *there*. Link aggressively to the owning document for architecture, rationale, algorithms, history, or extended examples. **One explanation has one home**; essential contract facts may repeat locally.

Keep non-obvious rationale when omitting it could plausibly cause misuse or an incorrect simplification. Otherwise state the consequence and link the rationale to its home.

## Required coverage by prose location

Index coverage by **where the prose lives**, not by what kind of document it is in. Add or restore prose when the code, types, and structure do not communicate the contract below; do not add a comment when those facts are already obvious locally.

- **Public API docs:** caller-visible return distinctions, throws or rejections, side effects, ownership, timing, cancellation, durability.
- **Internal comments:** non-local structure and genuinely complicated local structure — invariants, race ordering, ownership, security boundaries, surprising failure behavior. Delete control-flow narration and code restatement.
- **Module headers:** the module's role, dependencies, responsibilities, and non-obvious architecture choices; link each architecture choice to its owning explanation.
- **Tests:** only non-obvious test design — why a fixture, an assertion, a platform accommodation, a real entry path, or an indirect observation is necessary. Delete walkthroughs and inventories.
- **How-to guides:** prerequisites, required actions, the real entry path, observable verification, concise warnings.
- **READMEs:** the consumer contract — configuration, semantics, failures, limitations, extension points, and effects visible to a model or a user. Quote stable text the package owns; link generated catalogs and cross-package owners. Keep durable gaps and maintainer traps; drop ordinary cleanup inventories.
- **Decision records:** unique rationale, mechanisms, alternatives, consequences, shipped verification evidence, and named coverage gaps. Once implemented, state shipped reality in the present tense — remove planning checklists, keep the evidence that pins the decision.
- **Postmortems:** the incident sequence, evidence, causal chain, impact, prevention. Remove repeated persuasion and implementation detail that does not establish causality.
- **Skills and agent instructions:** behavioral guardrails and explicit scope limitations — including saying plainly that the document is guidance rather than a script. Keep the workflow concise and link its source of truth.
- **Examples and configuration comments:** access limits, non-obvious wiring or load order, security stance, replay behavior, exceptions, likely misuse. Do not narrate entries the configuration already shows.
- **Prompts and visible strings:** **treat wording as behavior.** Inspect text, accessibility names, tooltips, placeholders, and format templates together. Update the owning executable scenario when text a model or user sees changes. If your authorized scope has no owning scenario, leave the wording unchanged and report the deferral — never fold it silently into a prose-only edit.
- **Diagnostics:** the failing subject or path, the violated rule, and the correction when it is non-obvious. Remove internal execution narration.

Preserve searchable mechanism names and meaningful modal, temporal, or negative emphasis. Normalize only decorative emphasis.

## Voice

- **Say what the subject does, not what it is.** A summary describes what a reader or agent can *do* — outcomes, when to choose it, the main cost — never the subject's role, type, or internal identity. "Registers a handler and appends event records" is identity narration; "you can save a note per message, and it survives a restart" is what it does.
- **Explain, do not enumerate.** Developer-facing detail covers the design concept, the architecture, and the rough dataflow — enough to understand how the thing works — and links code for exact detail. No full API catalogs, exhaustive field lists, or docstring restatement.
- **Current state only.** No migration talk or history outside a section explicitly marked as non-authoritative scratch. If a document has such a section, it is the only place partial ideas and working hypotheses may live; everything else is polished current-state prose.
- **Controlled technical English**, per [references/controlled-english.md](references/controlled-english.md) — which also carries the review-length prompts and the quality criteria to judge a page against.

## Borderline decisions

A case is borderline **only** when at least two versions satisfy the complete-proposition rule and they trade accepted principles against each other. A rewrite with one proposition-preserving answer is not borderline — it is just the answer.

Working automatically: apply clear edits where authorized and report genuine borderline cases without asking. **Do not weaken a proposition to make progress.**

Working interactively: group analogous passages under the governing principle, present two or three viable versions, recommend one, and state the factual or structural difference between them. **Do not offer inferior distractors** — a fake choice wastes the decision you asked for.

Once a borderline case is decided, apply the learned rule to every analogous passage in scope, and distil the principle into [references/examples.md](references/examples.md) without review history or reviewer narration.

## Workflow

1. Confirm the scope, the mode, and your write authority. Read the project's own instruction files.
2. Read the owning code or document before judging a passage. For unfamiliar cases, read [references/examples.md](references/examples.md).
3. Inspect the whole requested scope, not only the largest files. Use searches and counts to find candidates, then judge each passage semantically.
4. Classify each candidate: keep, add, trim, restore, restructure, or defer. **Do not manufacture edits to satisfy a deletion target.**
5. Update the owner before any derivative. Re-check analogous passages after learning a new rule.
6. Run the narrow relevant checks and the documentation checks named in `.ledger.yml`. Verify the final diff contains no excluded path, and report an accidental match rather than claiming a clean exclusion history.
7. Report the inspected scope, the changes applied, the deliberate keeps, the deferrals, and the checks actually run.
