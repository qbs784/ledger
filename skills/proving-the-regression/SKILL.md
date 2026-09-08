---
name: proving-the-regression
description: Use when adding a guard, rule, validator, lint, schema, or check; when fixing a bug and about to assert the fix works; when a test claims to cover a scenario; or before stating that a rule is enforced. DO NOT invoke to choose which checks to run before pushing — route that to ledger:refusing-busywork.
---

# Proving the regression

**A check you have not seen fail is not a check.** Coverage says a line ran. Only a failing negative control says the scenario is checked. Everything here follows from that one sentence.

This skill owns whether a check can fail. It does not choose which checks to run for a given change.

This matters most where it is least convenient: a new rule feels done when the valid case passes. But a rule that never rejected anything is indistinguishable from a rule that cannot reject anything, and the two stay indistinguishable until the day it was supposed to save you.

## The negative control

Before trusting a guard, make the case it exists to reject, watch it fail, then revert.

- Observe an ordinary regression fail **before** the fix when practical.
- For a new static, schema, or corpus guard, temporarily introduce the rejected case and observe the intended failure. Confirm it fails **for the intended reason** — a guard that rejects your fixture because of a syntax error has not been proven.
- A strong promise needs both a focused valid fixture **and** an invalid one that proves the check can fail.
- Where a check is meant to reject a candidate before publication, verify it rejects at that point, not merely somewhere downstream.

## Verify the world, not the self-report

Assertions must fail on the intended regression and verify **external** state — files, events, logs, exit codes, disposal, database rows — rather than restating the implementation or trusting a component's own account of what it did.

This is not pedantry about test style. A keyword probe on a worker's own output lets a worker that did nothing pass by claiming success, and that failure mode is now routine rather than hypothetical. So an end-to-end assertion re-runs the command or re-reads the file **externally**, and asserts that files it did not intend to touch are byte-identical.

Restating the implementation is the same defect wearing different clothes: a test that asserts the function called the method it obviously calls will pass for any implementation that keeps the shape and loses the behavior.

## Through the real entry path

Exercise the shipped entry — the published binary, the loader, the worker, the subprocess, the built artifact — wherever the change reaches it. Read `commands.real_entry_point` and `commands.build` from `.ledger.yml`.

A hand-assembled harness silently skips whatever the real entry does: export validation, argument parsing, module resolution, environment setup, packaging. Guards that only ever run against a hand-built fixture are guards against a fixture.

## Match the proof to the failure mode

- **A race:** use a barrier to place the contested transition at a deterministic point and prove the operations actually overlap. Repeated execution alone is not a race test.
- **A host resource** — port, socket, shared path, subprocess: run independent processes concurrently when cross-process isolation is part of what you are claiming.
- **A fixture that spawns with its own deadline:** assert that no signal or timeout ended the child *before* asserting its exit status, or a killed child reports as a status mismatch and sends you after the wrong bug.
- **A timeout:** keep the outer wait far larger than the deadline under test, or load decides which fires first.

## What does not count

- Stress runs **supplement** a deterministic regression; they do not replace one.
- A passing rerun is not evidence that anything was fixed.
- A green check whose negative case was never tried is an untested check that happens to be green.
- Retries, skipped tests, and pending CI are not passing. Report them as what they are.

When you cannot construct a negative control, say so and name what would be required. An honest gap is worth more than a claim of coverage that nobody can check — and it is the only version of this that survives someone reading it six months later.
