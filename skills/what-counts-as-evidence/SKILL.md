---
name: what-counts-as-evidence
description: Use when about to state that something works, passes, is covered, is fixed, is safe, or is done; when reading a green check and deciding what it actually proves; or when tempted to make a check pass by changing the check. DO NOT invoke to choose which checks to run for a change — route that to ledger:refusing-busywork.
---

# What counts as evidence

**A signal is evidence only of what it actually observed.** Everything below is that sentence applied to the signals people habitually over-read.

This skill owns what a signal proves. It does not choose which signals to gather, and it is guidance rather than a checklist — the table below is calibration, not an inventory to work through.

This is the discipline that matters most when the work is done by an agent, because an agent will produce a confident summary either way. The summary is not the evidence. The summary is a claim *about* the evidence, and the two come apart silently.

## Signals that are not evidence

Each of these is a real thing to know, and none of them proves what it is routinely taken to prove.

| Signal | What it actually shows | What it does not show |
|---|---|---|
| Coverage | the line executed | that the scenario is correct |
| A passing rerun | this run passed | that anything was fixed, or that the failure was infrastructure |
| One timeout | this run exceeded a deadline | that there is a product race |
| A fixed sleep | time passed | that setup completed or cleanup settled |
| A stress run | it survived N repetitions | what a deterministic regression would show |
| An exit code of zero | the command ran to completion | that it did the work you wanted |
| A queued merge | the request was accepted | that it landed |
| A structural check on a translated pair | the structure matches | that the meaning matches |
| A zero-hit search | this pattern found nothing | that nothing is there — until the pattern has matched a known positive |
| A noisy search | this pattern matches a lot | that its hits are relevant — until it has rejected a near-miss negative |
| Verifying an artifact's inputs | the inputs were right | that the produced artifact is right |
| Dates, titles, and file names | what someone typed | what the thing is |
| A check's silence | it did not complain | anything about what it never inspected |

Two corollaries worth stating on their own, because they are the ones that get skipped:

- **Retries, skipped tests, and pending checks are not passing.** Report them as what they are. A summary that folds them into "green" is false in the only direction that matters.
- **Do not run until something happens to pass and call that result stable.** Repetition until success is selection, not evidence.

## Never fake a green

Making the signal green without making the claim true is the most expensive thing you can do here, because it destroys the signal for everyone afterward.

- Do not suppress empty results to make a lane pass. A test lane that reports success having collected no tests is not a test lane; a flag that permits that is a way to fake a green.
- Do not lower a threshold, narrow a check's scope, or exclude a file to hide something the check would have caught.
- Do not weaken an assertion, normalize away unstable behavior, or swallow an error to stop a failure from surfacing.
- **When a claim fails to reproduce, fix the claim — not the test.** The test just told you something true.
- Do not push and hope CI differs. If a relevant check fails, stop and fix it, or explain precisely why CI is expected to differ.
- Bypass an automated hook only when the user explicitly asks or agrees, and then report exactly what failed and why.
- Do not manufacture activity to move a status: empty commits, allow-empty pushes, draft toggles, and revert-and-restore bounces add junk history and usually do not change the state you were trying to change.

For the specific list of fixes that mask a flaky test rather than resolving it, see `ledger:designing-concurrent-tests`.

## What raises a signal to evidence

Four questions. A signal that answers all four is evidence for the claim you are making.

1. **Did it observe the thing you are claiming?** Not something adjacent, not a proxy, not the inputs to the thing.
2. **Can it fail?** A check whose rejecting case has never been tried is an untested check that happens to be green. Prove it with a negative control — `ledger:proving-the-regression`.
3. **Did you run it, on this state, now?** Not remembered, not inferred from a config file, not read off a neighbouring project. See `ledger:fact-checking-by-execution`.
4. **Does it verify externally?** An assertion should re-read the file, re-run the command, or inspect the emitted event — not accept a component's or an agent's own report of what it did.

A strong claim needs a valid case **and** an invalid one that demonstrates the check can reject. One without the other is half a proof, and it is always the same half that is missing.

## Reporting

State what you ran, what you observed, and what that supports. Then state the gaps: what you could not verify, and what would be required to verify it.

An honest gap is more useful than a confident summary, and it is the only version that still holds when someone checks it later. If you cannot support a claim, do not soften the claim — drop it, and say which one you dropped.
