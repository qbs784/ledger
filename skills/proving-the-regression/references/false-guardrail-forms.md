# False-guardrail forms

A catalog for [the negative control](../SKILL.md#the-negative-control) — the step
where you make the case a guard exists to reject and watch it fail. This page is
what "cannot fail" looks like from outside, so you can recognise a form before
you have built the control that would expose it.

The failure this addresses is not a missing test. It is a test that was written,
that passes, and whose passing means nothing. Its signature: every
deterministic check is green, the delivery report is full of numbers, the demo
runs — and the defect surfaces only in a downstream consumer or the real
workflow. Read one assertion at a time, each looks reasonable. That is why
self-review does not find these and an adversarial reader does.

## Two families

**Forms 1-8: the guard's own logic cannot reject.** The assertion, the
threshold, or the expected value is built so that the thing it forbids still
passes.

**Forms 9-12: the guard is real and its logic is correct, and the hole is in
the seam between it and the execution path.** A unit test proves a guard behaves
correctly *when called*. It cannot prove the guard **will** be called, that its
verdict **stops** anything, or that its verdict **survives** to be read. These
are invisible at the unit layer by construction.

## The twelve

| # | Form | What it looks like | The question that finds it |
|---|---|---|---|
| 1 | **Unreachable in the real workflow** | The gate is defined over a delta, and another rule in the process eliminates that delta immediately, so the gate never fires | After the **complete** normal workflow — including every remediation step it mandates — is it still red? |
| 2 | **The gate has a bypass** | The verdict covers only objects that entered the set, and a class of object never enters, so it is counted by nothing | Is there anything that escapes checking *because* it never arrives? Where did those go? |
| 3 | **The assertion points one way** | A lower bound, where both over-counting (phantom entries) and under-counting (silent drops) make it greener | Do **both** directions of error turn this red, or only one? |
| 4 | **The expected value is tautological** | The expectation is routed through a file or a wrapper, and traced to the end it is still computed by the thing under test | Which **independent** implementation produced the expected value? Can the two break apart? |
| 5 | **The lock spins** | The assertion's name matches the behavior, but deleting the logic it guards leaves the test green; or the fixture's shape has zero occurrences in the real corpus | Delete that logic — which assertion goes red? How many instances does this fixture's shape have in the real corpus? |
| 6 | **The lock is only claimed** | "Does not modify X", "never discards Y", "no network dependency" exist as sentences in a document and nowhere else | Which line holds the assertion for that sentence? |
| 7 | **Exit signal conflates causes** | "The tool broke" and "the product changed" return the same code, so nobody can triage a red run, and the run gets suppressed | Can a consumer tell a crash from a real alarm? |
| 8 | **The contract lives only locally** | A cross-module agreement is recorded inside one unit's own test plan; it works today, and a downstream implementer reads a stale description elsewhere | Where is this agreement's **single** authoritative definition? Will the downstream reader open that file? |
| 9 | **Never wired into the path** | The guard exists, its unit tests pass, a search finds it, a document calls it mandatory — and it executes zero times in the production path | How many instantiation sites does it have? Which paths, and at which step of each? |
| 10 | **The verdict does not stop anything** | The guard runs and sets a rejection flag, and the main loop does not break on it, so rejected input flows onward | Does that flag have a corresponding break or early return? Set it to reject: does one single downstream step still run? |
| 11 | **The verdict is overwritten** | A rejection reason shares one field with "unknown" or "skipped", last write wins, and a safe rejection is erased by a low-confidence abstention — leaving not even a record | How many writers does that field have? Do they mean the same thing? Can the first be overwritten by a later one? |
| 12 | **The measurement is at the wrong layer** | The gate reads a perfect score because it calls the classifying function directly instead of going through the deployed shape, where the real rate is nothing like it | Is this metric's entry point a **function** or the **deployed shape**? Has anyone measured the gap? |

Forms 1, 2 and 8 share a property that makes them the most expensive: green
now, cost deferred. By the time one surfaces, something downstream already
depends on it.

Forms 9-12 are caught by one method and no other: **on the deployed shape, per
path, send an input that ought to be rejected.** The criteria for that probe are
frozen before you run it — decided afterwards, they get fitted to the result.

There is a family more insidious still, and it is out of scope here: **the
verification method itself fails** — a subset stood in for the whole, the
command never executed, a cached result was read, a field name was guessed.
Those failures are shaped like failures of the thing under test, so they send
you to fix something that is not broken, or to report a defect upstream that
does not exist. `ledger:what-counts-as-evidence` governs what a reading is
allowed to establish, and the calibration rules for a search are in
`ledger:proving-code-is-dead`.

## Six questions

Run these over an assertion or gate you have just written.

0. **Will this execute in the production path?** Which paths, at which step
   (form 9)? Does its rejection **interrupt** execution (form 10)? Can the field
   it writes be **overwritten** later (form 11)? Is my measurement entry the
   deployed shape or a direct call (form 12)?
1. After the **complete** normal workflow, including every remediation it
   mandates, is this gate still red?
2. Is there an object that escapes checking because it never enters the set?
3. Is this assertion an equality or a bound — do **both** directions of error
   turn it red?
4. Which independent implementation produced the expected value? Does it share
   code or assumptions with the subject?
5. **Remove the logic under test:** which assertion goes red? No answer means
   that logic has no lock on it.
6. Every sentence of the form "does not do X" — which line is its assertion?

## Where mutation survivors cluster

"Remove it — which assertion goes red?" is the single most effective probe, and
it belongs in the delivery report as a section with one row per decision point.

The distribution matters more than the count. An author mutating their own work
concentrates on the core decision branch, and those mutations die — the branch
is well covered because it is what the author was thinking about. Survivors
cluster in the places that look like they carry no logic:

- **every output field** — set it to empty or to a constant: does any assertion
  go red?
- **every exclusion or skip rule** — remove the whole exclusion: does the result
  change? If it does not, the rule is dead code, and the test that appears to
  cover it is spinning.
- **every guard** — a whitespace strip, an identity comparison, a boundary
  operator turned from strict to inclusive.
- **every count field** — the number nobody asserts on.

So a reviewer's mutations should deliberately target the side the author did not
touch. Mutations only in the core branch report that the core branch is covered,
which was not in doubt.

### What a spinning lock looks like

An implementation excluded a class of declaration file from a scan, on the
grounds that counting it would double-count against another source. A test
asserted the result contained exactly one entry. Mutation: remove the entire
exclusion. **The result was unchanged and the test stayed green.** The reason
was that objects of that class were reached only through injection and never
through the form the scan looked for, so they were never in the scanned set to
begin with. The exclusion was dead code, and the test was pinning a risk that
did not exist.

The fix is not to delete the test. It is to move the assertion from *the result
is right* to *the mechanism ran*: assert that the classifier identifies that
file as excludable, and that the skipped count is one. A test on the result
cannot distinguish a working exclusion from an unnecessary one.

## The bypass cost gradient

Once you have blocked one way around a guard, ask immediately: **what is the
next cheapest way around?** Bypasses come in gradients, and blocking the first
rung while leaving the second costs the same as blocking nothing:

```
1. an empty object                           blocked by the first version
2. every required field filled with "x"      as cheap as 1, plus four keystrokes
3. editing the number in the threshold file  cheaper than 2
```

Two judgements go with it:

- **Who bypasses.** Not a malicious party. Someone whose run is red, near a
  deadline, looking for the fastest path to green — which is to say, everyone.
- **When.** The moment is predictable: the first bulk backfill, the release, the
  on-call hour. "Nobody does this today" is not an argument, because the
  question is whether anyone has a motive **at that moment**.

Three design consequences:

- **An enumerated field needs a controlled vocabulary, and the vocabulary comes
  from the requirement** — changing it means changing the requirement first, so
  both go through review together. A string invented at the implementation site
  is not a vocabulary.
- **A manual acknowledgement needs a ratchet.** Loosening is allowed; loosening
  without a trace is not. Record who and why.
- **Degradation must be visible.** Skipping a check when its configuration is
  absent is a reasonable way to avoid a false red. Skipping it silently, so that
  everything reads as correct, is the most concealed false guardrail there is —
  the fact that the check did not run belongs in the machine-readable output.

## Exit signal semantics

A gate's exit code is its entire interface to whatever consumes it, so the
semantics have to separate the two causes that form 7 conflates: **the subject
is at fault** and **the gate itself broke**. A consumer that cannot tell them
apart eventually suppresses both, and a suppressed gate is worse than an absent
one because the tree still looks guarded.

Give a broken gate a distinct code from a real finding, and say in the gate's
own output which one it is reporting.
