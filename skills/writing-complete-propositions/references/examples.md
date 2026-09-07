# Calibration examples

Each case shows the same passage over-trimmed, balanced, and over-detailed. **Identify the governing principle in each — these are not text templates.** The principle is stated last, because the point is to notice what was lost or padded before reading why.

## A cap that has a reason

**Over-trimmed:** "Payloads are capped at 1 MiB."

**Balanced:** "Payloads are capped at 1 MiB, measured on the complete serialized value including envelope fields; an oversized payload is rejected before any partial write."

**Over-detailed:** "Payloads are capped at 1 MiB. The cap is applied in `serialize`, which calls `byteLength` on the output of `encode`, after the envelope is attached but before the write begins, by comparing against the `MAX_PAYLOAD` constant defined at the top of the module…"

*What the cap covers* and *what happens when it is exceeded* are propositions a caller depends on. Where the check lives is implementation the reader can find.

## An option with a failure mode

**Over-trimmed:** "Set `strict` to validate input."

**Balanced:** "Set `strict` to validate input. In strict mode an unknown field throws; otherwise unknown fields are dropped silently."

**Over-detailed:** "Set `strict` to validate input. Strict mode was added because silent dropping made schema drift hard to notice; internally it flips a boolean that the validator reads on each field visit…"

The over-trimmed version omits the whole reason anyone chooses the option: the two behaviors differ in whether you find out. Rationale for *why the mode exists* belongs at its owner.

## Ownership of a returned value

**Over-trimmed:** "Returns the buffer."

**Balanced:** "Returns the internal buffer without copying. The caller must not retain it past the next `read`, which reuses the same allocation."

**Over-detailed:** "Returns the internal buffer without copying, avoiding an allocation per read, which matters on the hot path where profiling showed…"

Ownership and lifetime are the contract. Without them the signature reads as a safe handoff, and every caller writes the same bug.

## A concurrency invariant

**Over-trimmed:** `// Lock the queue.`

**Balanced:** `// Lock before publishing: a subscriber added during dispatch would receive the in-flight event twice.`

**Over-detailed:** `// Lock before publishing. We acquire the mutex, then iterate subscribers, then release. This prevents the case where a subscriber added during dispatch receives the in-flight event twice, which happens because the iteration holds an index rather than a snapshot…`

The over-trimmed comment restates the code. The balanced one states the invariant and the consequence of violating it — which is the only part the reader cannot see.

## A deliberate omission

**Over-trimmed:** `// No cleanup needed.`

**Balanced:** `// No cleanup: the listener is attached to the request-scoped emitter, which is discarded with the request.`

**Over-detailed:** a paragraph on the request lifecycle.

"No cleanup needed" is an assertion the next maintainer cannot verify and will not trust. Naming *why* nothing leaks makes it checkable in one step.

## An empty catch

**Over-trimmed:** `catch {}`

**Balanced:** `catch { /* readdir throws only if the directory vanished between the stat and the read; a vanished directory has no entries to report. */ }`

**Over-detailed:** an enumeration of every error the call can throw.

An empty catch must name what it swallows and why nothing else can reach it. This is required prose, not optional commentary — and when the stated reason turns out to be wrong, **fix the reason rather than deleting it.**

## A limit worth keeping the provenance of

**Over-trimmed:** "Depth is capped at 512."

**Balanced:** "Depth is capped at 512 (measured: 512 nests ≈ 0.15s synchronous; 4096 blocks the loop)."

**Over-detailed:** the full benchmark methodology inline.

The word "measured" is load-bearing. Drop it and the number reads as a definition, so nobody re-measures before raising it.

## Trimming that is not an improvement

**Current:** "The writer fsyncs before returning, so a crash after the call cannot lose the record; callers that batch should call it once per batch rather than per record."

**Shorter but worse:** "The writer fsyncs before returning. Batch callers should call it once per batch."

**Balanced decision:** keep the current version.

The shorter version drops the durability guarantee (*what* fsync buys the caller) and the reason batching matters, keeping only the instruction. It reads cleaner and answers fewer questions — which is the failure this skill exists to prevent.
