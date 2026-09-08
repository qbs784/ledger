---
name: diagnosing-flakes
description: Use when a test or CI job fails probabilistically — passes on rerun, fails on one platform only, fails under load, or fails in CI but not locally. Also use when asked to investigate a flaky test, a red run nobody can reproduce, or an intermittent timeout. DO NOT invoke to design a new test for isolation — route that to ledger:designing-concurrent-tests.
---

# Diagnosing flakes

Use this workflow when the task is to investigate an existing probabilistic test or CI failure. Preserve the requested read/write scope: **diagnosis does not authorize a fix, a workflow rerun, or a configuration change.** Ask before crossing into any of those.

## Freeze the evidence

Record the repository, workflow, job, commit SHA, runner labels, timestamps, the exact failing test or command, and the first stable failure signature. Keep infrastructure messages separate from test output.

Compare multiple failing and passing runs. Prefer runs of the same SHA; when that is impossible, verify that the relevant test and CI configuration are identical across the compared commits. **One passing rerun does not prove an infrastructure fault, and one timeout does not prove a product race.**

Use the CI provider's logs and run metadata to establish whether failures overlap on one host or resource namespace. Preserve links to the supporting runs rather than pasting large logs.

## Classify the failure

Classify from recorded evidence, not from the eventual fix. The third column is what separates a class from its neighbours; a class assigned without that evidence is a guess.

| Class | What it looks like | What discriminates it |
|---|---|---|
| Host-resource collision | the failure needs something else running at the same time | independent processes or jobs acquire the same port, socket, database, predictable path, cache, or external namespace |
| Incomplete lifecycle | output or mutations from one test surface inside a later one | teardown returned before children, workers, streams, servers, or callbacks reached quiescence |
| Process-global contamination | the outcome depends on test order, or on state the test never set | a leaked environment variable, working directory, fake timer, global, mock, locale, or module-level state |
| Load-sensitive synchronization | the failure follows load on the machine, not any change in input | a sleep, polling interval, or assumed event-loop turn substitutes for observable readiness or completion |
| Platform or entry-path mismatch | the failure consistently follows one operating system, shell, filesystem rule, source/build mode, or executable entry | that lane fails and the others pass, on the same commit and the same configuration |
| Product concurrency defect | the race is in shipped behavior, not in the test | the test controls its own resources and reproduces deterministically with explicit overlap |
| External-provider transience | a live API or network boundary owns the failure | the signature matches that provider's documented retry policy |
| Runner infrastructure | checkout, dependency download, disk, host process, or runner service fails independently of the test command | direct runner evidence, which is required before assigning this class |

Two rows carry a qualifier that does not fit beside them:

- **A platform result does not transfer.** Timestamp precision, environment variable name case, handle-release timing, and permission semantics all differ between Windows and POSIX hosts, so a case passing on one platform says nothing about another lane.
- **A pool with no host metrics is still classifiable.** Where a self-hosted pool exposes no host metrics, say so and classify from what the logs do carry: one signature repeating across unrelated branches on one pool is evidence of shared-host contention even when the host cannot be inspected.

If the evidence supports more than one independent fact, report each one. **Do not collapse a timeout, a signal, an exit code, and an assertion into a single inferred outcome.**

## Reproduce the smallest relevant topology

Start with the owning test file or focused test name. **Increase concurrency only to the first rung that reproduces the signature.** A higher rung reproduces more readily and attributes less: once several components contend at once, the run no longer names which one owns the failure.

| Rung | Topology | What reproducing here shows |
|---|---|---|
| 1 | one test process | the signature needs no concurrency at all; the owner is the product, the platform, or a wait that never observes readiness |
| 2 | concurrent tests or files under one runner invocation | tests interfere when scheduled together: order dependence, leaked global state, or teardown that returned early |
| 3 | multiple independent test-runner processes | separate processes do not contain it, so the contested thing is a host resource rather than module state |
| 4 | the project's own check lane at its configured worker count | the lane CI actually runs produces the contention, not a topology assembled by hand |
| 5 | separate jobs or runner processes sharing the implicated host resource | the collision crosses job boundaries, so no fix confined to one test process reaches it |

Match the active runner configuration, environment knobs, source/build mode, and platform. **Do not lower a production timeout or add random load merely to manufacture a different failure.**

Where the signature belongs to a platform the available host cannot run, the ladder stops at the last reachable rung. Record that limit rather than substituting a passing run on another platform, then use CI as the reproduction, changing one suspected owner per run so the result stays attributable.

For a suspected race, replace probabilistic timing with a barrier at the contested transition. For a suspected host collision, prove simultaneous acquisition of the same identifier, or prove that atomic unique allocation removes the conflict.

## Fix at the owner

When implementation is authorized, fix the component that allocates, publishes readiness, mutates global state, or owns teardown. **Do not hide the failure in a snapshot normalizer, a retry wrapper, a broader timeout, a global serialization setting, or a weaker assertion.**

Keep stable fixture data separate from live resource allocation. A recorded URL can remain stable while the fixture maps its transport to an OS-assigned port; a stable expected path can remain an assertion without becoming a shared writable directory.

## Close the investigation

The evidence is complete when:

- the original signature has a supported classification;
- the smallest relevant topology reproduces it, or the external evidence is sufficient and the reproduction limit is explicit;
- an authorized fix fails under a negative control or pre-fix state, and passes under the same topology afterward;
- any concurrent-process, restoration, or quiescent-teardown proof required by the resource owner passes;
- remaining CI checks are reported as passing, pending, skipped, or failing from their observed state.

**Do not run until a test happens to pass and call that result stable.** Stop after the selected evidence establishes the conclusion, or report the missing fact that blocks classification.
