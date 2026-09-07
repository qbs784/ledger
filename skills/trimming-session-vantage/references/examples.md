# Calibration examples

Worked pairs for [the taxonomy](../SKILL.md#taxonomy) and [the keep rules](../SKILL.md#what-is-not-session-vantage). Identify the governing principle in each; these are not text templates.

**This file deliberately quotes leaked wording**, which is why the probes exclude this skill's own directory. A run that reports hits here has not applied its exclusions.

## 1. Dead draft and discussion citations

**Leaked:** "Frame budget is 64 KiB per decision 7."

**Fixed:** "Frame budget is 64 KiB; a larger frame fails loudly in `decode`."

Nothing at the current commit answers to "decision 7". The number was the fact; the citation was scaffolding. Restating the consequence makes the constant defensible without it.

**Leaked:** "Retry semantics follow plan §1.4."

**Fixed:** "Retry semantics follow [the retry contract](../../transport/README.md#retries)."

Here the decision does have a committed owner, so the citation is retargeted rather than deleted. Resolvability is the test — not whether a pointer exists, but whether it lands.

## 2. Stack and change-request vantage

**Leaked:** "This PR adds the queue; a later PR in this stack wires the worker."

**Fixed:** "The queue publishes to `worker.enqueue`. No worker is wired yet — `TODO(queue): attach the worker` tracks it."

Two propositions hid in one sentence: a shipped mechanism and a deferral. The mechanism becomes present-tense, and the deferral gets a marker that a reader can act on.

## 3. Change narration and version stamps

**Leaked:** "Colors used to come from the theme file; they now come from tokens."

**Fixed:** "Colors come from tokens."

**Leaked:** "The v1 parser no longer rejects trailing commas."

**Fixed:** "The parser accepts trailing commas."

**Leaked:** "Guard against re-entry — this bit us in the old scheduler."

**Fixed:** "Guard against re-entry: without it, a nested dispatch reorders the queue."

The third pair is the one people get wrong. A fixed regression is worth recording, but as a **present-tense counterfactual** rather than as repository history. "Without X, Y happens" is verifiable at the current commit; "this bit us" is not.

## 4. Review choreography

**Leaked:** "Rejected in review: a shared registry. The reviewer confirmed per-instance is fine."

**Fixed:** "Each consumer owns its own registry; a shared one would let one consumer's teardown drop another's entries."

Keep the surviving decision and the reason it holds. Delete who said it, when, and in what round.

## 5. Reviewer-addressed justification

**Leaked:** `// The cast is safe — it simply narrows a union we already checked above.`

**Fixed:** `// Narrowed by the discriminant check above; the default arm is unreachable.`

A comment arguing its own correctness addresses a reviewer who has left. State the invariant instead. Note that "simply" is almost always a tell.

## 6. Restatement and derivation transcripts

**Leaked:** `// First we sort the entries, then we walk them and accumulate the totals, then we return.`

**Fixed:** deleted. The three-line function shows all of it.

**Leaked:** `// We check length before indexing so we don't go out of bounds.`

**Fixed:** deleted — unless the bound is non-obvious, in which case name *why* it can be exceeded, not that it is checked.

## 7. Hedges and planning residue

**Leaked:** "Buffer is 64 KiB, probably fine for now."

**Fixed:** "Buffer is 64 KiB, which holds the largest observed frame (48 KiB) with headroom; a larger frame fails loudly in `decode`."

The hedge was standing in for a measurement nobody had taken. Taking it is the fix; deleting the hedge alone would leave an unexplained constant.

## 8. Working-language slips

**Leaked:** "Renders the badge on the client 端."

**Fixed:** "Renders the badge on the client."

A single working-language token left inside published-language prose. Translate it, or delete it when the surrounding sentence already carries the meaning.

## Keeps

Each of these was **deleted by an unaided pass** and had to be restored. The failure mode is symmetric: over-deletion is as common as under-deletion, and less visible.

### Issue references are durable on every surface

**Keep:** "The cap applies to the complete rendered value, wrappers included (issue #1470 owns the follow-up)."

An unaided pass deleted this, reasoning that issue citations belong in decision records. Wrong direction: issues resolve at the current commit from any surface, and "#N owns the follow-up" is the sanctioned way to carry deferred work in a README.

### A dead name-drop is not "naming the owner"

**Delete:** "Badge renderer over the widget seam (see the widget-rendering design doc)."

An unaided pass **kept** this, reasoning that it names the owning document by topic. The test is resolvability, not form: no committed file answers to "the widget-rendering design doc", so the pointer is dead. Retarget it to a committed owner if one exists; otherwise delete it.

### Suppression justifications

**Keep (after fixing):** `// lint-disable-next-line no-non-null-assertion -- the one-element literal guarantees index 0.`

The justification clause is required prose. When the stated reason is false — the original said "the loop guard above proves an entry exists", with no loop in sight — **fix the reason; never delete it.** A suppression with no reason is worse than the lint it silences.

### Measured bounds

**Keep:** "Depth cap (measured: 512 nests ≈ 0.15s synchronous; 4096 blocks the loop)."

The measurement pins the constant against uninformed retuning, and "measured" is the provenance that separates data from a guess.

### Runtime old/new is not change history

**Keep:** "The old connection drains before the new one accepts."

"Old" and "new" name two live runtime objects during handover, not repository states. The change-narration ban is about repository history, not lifecycle vocabulary.

### Runtime natural time is not a version stamp

**Keep:** "What is today's date?"

The prompt asks about the runtime clock; "today" does not contrast repository states. And because this text reaches a model, any rewrite needs evidence about the owning behavior first.

## Overcorrection traps

**Every trap below actually shipped and was caught in review.** That is what makes them worth reading: each one is a plausible-looking trim that a careful editor produced. Enumerate a passage's propositions before trimming it.

### Flipping an obligation into an endorsement

**Original:** "These direct registrations are exceptions pending migration to slots."

**Overcorrected:** "These direct registrations are sanctioned exceptions."

**Right:** unchanged from the original.

"Pending migration" is an obligation; "sanctioned" blesses the status quo. The trim inverted the sentence's modality while shortening it — and the migration it was tracking would have been quietly cancelled by prose.

### Promoting a hypothetical to a shipped feature

**Original:** "A future IPC-based transport subclasses the executor and overrides `spawn`."

**Overcorrected:** "An IPC-based transport subclasses the executor and overrides `spawn`."

**Right:** "A hypothetical IPC-based transport — no such transport exists — would subclass the executor and override `spawn`."

Deleting the future-marker alone turns a design illustration into a claim that the class ships. Mark the hypothetical **explicitly** rather than merely unmarking the future.

### Deleting a true fact with the transcript around it

**Original:** "The notice narrates the check order; the notice text is also what the doc compiler compiles against."

**Overcorrected:** whole sentence deleted as narration.

**Right:** "The notice text is what the doc compiler compiles against."

Half the sentence was narration; the other half was a load-bearing coupling. **Delete clauses, not sentences,** when propositions share a line.

### Dropping provenance while keeping the number

**Original:** "The 4 MiB ceiling is measured: the largest generated module is 3.1 MiB."

**Overcorrected:** "The ceiling is 4 MiB; the largest generated module is 3.1 MiB."

**Right:** keep "measured".

Without "measured", 3.1 MiB reads as a definition rather than an observation, and nobody re-measures before raising the ceiling.
