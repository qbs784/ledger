---
name: trimming-session-vantage
description: Use when auditing or cleaning prose that reads like a leaked reasoning transcript: dead citations to drafts or discussions ("(decision 7)", "design §4.7"), change narration ("used to", "no longer", "the old X"), stack or review vantage ("a later PR in this stack", "rejected in review"), comments arguing their own correctness, control-flow narration, or unmarked hedges. DO NOT invoke to shorten prose generally — route that to ledger:writing-complete-propositions.
---

# Trimming session vantage

Session-vantage prose is prose whose viewpoint is the authoring session rather than the repository. It cites artifacts only that session could see, narrates the change instead of the state, or argues with a reviewer who has since left.

This is the most common durable defect in machine-written prose, and it is systematic rather than occasional — a model writing at the end of a long working session has the whole session in view and the repository only partly. Nobody notices at review time, because at review time the transcript is still available and every reference still resolves. It stops resolving later, quietly, for everyone.

**The fix is never deletion alone when a passage carries factual clauses.** Restate each fact so it stands on its own at the current commit, then delete the transcript around it. A passage carrying no facts — an audit code, control-flow narration — is deleted outright. This is guidance, not a script.

## The one test

For every suspect passage ask: **could a reader at the current commit, with no access to any session transcript, review thread, or uncommitted draft, resolve every reference and verify every claim?**

If no: restate the surviving facts from the repository's viewpoint and delete the rest. If yes: it is not session vantage, however historical it sounds.

But resolvability only clears *this* bar. On a current-state surface — a README, a reference doc, an API docstring — a resolvable change story is still change narration, and class 3 below routes it to where it belongs.

## Taxonomy

1. **Dead draft and discussion citations** — `(decision 7)`, `(audit C2)`, `design §4.7`, `plan §1.4`, phase labels (`T4`, `W3`, `P-I`), "the design doc", "(B ruling)". If the decision has a committed owner, cite it by name and path. Otherwise delete the citation and restate its factual clause so it stands alone.
2. **Stack and change-request vantage** — "a later PR in this stack", "this PR adds", "the previous commit". State the shipped mechanism or the extension point instead; deferred work moves to a `TODO` marker or an issue reference.
3. **Change narration and version stamps** — "used to", "no longer", "the old X", and indexical stamps ("v1", "this cut", "today", a "now" that contrasts with a past state). State the present behavior. A fixed regression becomes a present-tense counterfactual ("without X, Y happens"), never repository history ("used to Y").
4. **Review choreography** — "Rejected in review:", "the reviewer confirmed", draft ordinals ("v5 of this document"), round attributions. Keep the surviving decision and its rationale as plain fact; delete who said it when.
5. **Reviewer-addressed justification** — "the cast is safe — it simply…", "this is correct because…". A comment arguing its own correctness is addressed to a reviewer, not to a maintainer. State the invariant that makes the code safe, or delete the comment if the code already shows it.
6. **Restatement and derivation transcripts** — control-flow narration ("first we X, then we Y"), test walkthroughs, proofs of obvious branches. Delete these; keep only a non-obvious contract or invariant.
7. **Hedges and planning residue** — "probably fine for now", "should be enough", deferrals with no marker. Promote to a `TODO`/`FIXME` marker or restate as the actual bound, then delete the hedge.
8. **Working-language slips** — fragments of the team's working language left in prose whose language is otherwise the project's published language, or the reverse in a translated counterpart. Translate or delete.

## What is not session vantage

An unaided pass fails in **both** directions: it deletes durable references and keeps dead ones. Apply these keep rules as written; [references/examples.md](references/examples.md) calibrates each one against a real mistake.

- **Issue references** — `#1470`, `TODO(name):`, "issue #N owns the follow-up" resolve at the current commit. Keep them on any surface, including a README.
- **Merged-change and issue citations inside decision records and postmortems** — these genres exist to carry a change story, so evidence citations are sanctioned there.
- **Suppression justifications** — a linter-disable reason, a coverage-ignore reason, an empty-catch explanation. These are required prose. Fix a false reason; never delete it.
- **Counterfactual-present regression pins** — "without X, Y happens", "a naive X would…".
- **Measured bounds** — "(measured: 512 nests ≈ 0.15s)" calibrating a constant. The provenance word "measured" is load-bearing.
- **Runtime old/new states** — "the old connection drains before the new one accepts" is runtime lifecycle vocabulary, not change history.
- **Historical stage names inside a decision record's change-story section** — "the first version shipped X" is safe there. Indexical stamps ("this cut") stay banned everywhere.
- **External references that resolve outside the repository by design** — standards sections (RFC 9110 §10.1.5), design-tool frame names. The §-ban covers uncommitted internal drafts, not external standards or committed documents that own their section numbering.
- **Project voice and genre forms** — "we" as project voice; a decision record's alternatives-considered section.

## Workflow

1. **Require an explicit scope**, and stop if you were not given one rather than inferring a repository-wide sweep. Never touch vendored third-party code or a frozen archive. Recorded fixtures and snapshots are derivatives, not prose targets: change the owning source and regenerate them, and only when an authorized behavior change requires new evidence.

2. **Audit read-only first.** Run the [references/recall-probes.md](references/recall-probes.md) battery, then judge every hit semantically. **The probes are neither the definition nor the coverage.** They over-match by design and under-match by nature, so also read the densest prose in scope — module docstrings, READMEs, decision records — with no pattern in hand. Each review round of the sweep this skill came from found cases no probe caught.

3. **Fix at the owner, per surface.** A generated catalog: trace every consumer, fix the source docstring or the generator template, then regenerate all derivatives — never edit the generated file. A translated counterpart: update it minimally rather than re-translating, and re-record whatever pairing record the project keeps. Model-visible or user-visible strings: change these only with evidence about the owning behavior; otherwise leave them and report the deferral.

4. **Before deleting anything, enumerate the passage's propositions** — actor, condition, timing, ordering, modality, negative guarantee, exception, ownership, failure, consequence — and confirm each survives your edit or was genuinely transcript. Then check the four [overcorrection traps](references/examples.md#overcorrection-traps): trims that flip an obligation into an endorsement, promote a hypothetical to a shipped feature, delete a true fact along with the narration around it, or drop provenance while keeping the number.

5. **Verify.** Re-run the probes expecting only sanctioned keeps and this skill's own directory. Confirm every remaining citation resolves at the current commit. Run the documentation checks named in `.ledger.yml` for the surfaces you touched.

Report what you changed by class, what you kept and why, and every deferral. A sweep that reports only deletions has hidden its own judgment calls.
