---
name: curating-decision-records
description: Use when adding, auditing, pruning, archiving, restoring, or reviewing durable decision records — architecture decisions, design notes, RFCs, postmortems. Also use when a new record may supersede an existing one, or when the active set has grown hard to read. DO NOT invoke to propose a code removal — route that to ledger:proving-code-is-dead.
---

# Curating decision records

A decision record exists to stop a decision being re-litigated. That makes the active set a working index, not an archive: every record in it is something a future reader is expected to read, so a record that no longer guides anything is not free — it is a tax on finding the ones that do.

This skill owns retention and archival mechanics. It does not judge whether a recorded decision was correct — a record that documents a mistake is still worth keeping if it stops the mistake being remade.

The goal is to reduce the active set **without erasing history that can still guide work.** Judge every record semantically. Read `records.path` and `records.required_sections` from `.ledger.yml`.

## Check supersession when you add a record

Every new record triggers a scoped audit of active records covering the same decision, mechanism, or rejected alternative. Classify each full or partial supersession **while writing the new record** — not later.

- Full supersession, already implemented: archive it in the same change.
- Partial supersession, or independently useful rationale: keep it and cross-link.
- An obsolete proposal: reject it, with an honest reason.
- A rejection that no longer prevents a plausible mistake: delete it.

**Do not defer a known match to a later corpus audit.** You are the only person who will ever have both records in view at once; a deferred match becomes two records that quietly disagree.

## Classify by remaining future value

Age, length, and count are **discovery aids, never criteria.** The retention question is only ever: is this likely to guide a future change?

- **Implemented, keep active** — its rationale, alternatives, negative guarantees, durable or wire semantics, ownership boundary, security rule, or reintroduction condition is likely to guide future work. **Length does not matter.** A 250-word record can be load-bearing.
- **Implemented, archive** — the decision shipped and is complete, and the body is unlikely to guide future work: one-off interface chrome, a narrow adapter, a minor closed bug, superseded implementation detail, or process history whose current behavior is obvious elsewhere. A 1,500-word record can be dead weight.
- **Proposed, never archive** — a live proposal stays active. If it is no longer worth pursuing, **reject** it with an honest reason; do not file it away as though it were decided.
- **Rejected, keep as a guardrail** — keep a rejection only while the losing idea remains a **tempting, meaningful mistake**, and the record explains why it loses.
- **Rejected, delete** — the idea is obsolete, superseded, or no longer plausible enough to be re-litigated. Repair or remove inbound links.

**Do not archive toward a quota.** Inspect every record in scope, classify analogous groups under one principle, and record genuinely borderline decisions with their outcome so the next reader inherits the reasoning rather than the result.

## Make the retired tier immutable

Convention is not enough: "we don't edit archived records" holds until someone does, and then nothing tells you which text changed.

- **Move the complete record**, including every translated counterpart and metadata sidecar. Keep the retired tier's path distinct from the active one.
- **Make no body edits.** Insert only an archival date marker, at a fixed position, with the same value across counterparts.
- **Seal it by content hash.** A hash manifest turns "please don't edit this" into a check that fails. Write it in an append-only mode that first proves every existing seal still matches, then adds the new entries — so a rewrite of an already-sealed record is caught rather than absorbed.
- **Redirect inbound links** from active prose: retarget them to current authority, point them at the archived path only when the historical snapshot is deliberately being cited, or delete them.
- **Never verify or repair links leading out of a retired record.** Those pointers are part of the snapshot. Fixing them edits history, and reporting them as valid claims something no check established — if your verifier deliberately skips them, say so rather than implying they were checked.

[scripts/seal-records.mjs](scripts/seal-records.mjs) implements that ordering over a directory of retired records and a manifest JSON beside it, needing nothing beyond a Node runtime:

```sh
node scripts/seal-records.mjs <retired-dir>          # verify every seal
node scripts/seal-records.mjs <retired-dir> --write  # verify, then append the new records
```

Verification fails on a sealed record whose bytes changed, a sealed record that has left the tree, and a record in the tree that no entry covers. **`--write` appends nothing when any existing seal fails**, so a rewritten record is reported instead of re-sealed at its new content. Pass `--init` once, alongside `--write`, to create the first manifest; it refuses to re-create an existing one, because re-sealing a whole tree at once is exactly how an edit gets absorbed. Run `--self-test` before trusting any of it: it plants each defect class in a scratch tree and proves the verifier rejects each one.

After sealing, the record is never edited, moved, reformatted, or deleted. It stays a valid link target, but it is a historical snapshot and **not authority for current behavior.** Treat a retired record's claims as what was true then.

## Validate and report

Run the seal verifier and the documentation checks named in the adapter. Then report, in this order: records kept active; records archived; rejections kept and deleted; proposals rejected; and every genuinely borderline case with its chosen outcome and the reason.

Report what the checks did **not** cover as explicitly as what they did. A curation pass that reports only a count of archived records has hidden all of its judgment — which is the entire content of the work.
