---
name: receipts
description: 'Shape every answer so a claim about state arrives with the evidence that produced it: name the command, quote its output, say plainly what was not verified. Invoke with /ledger:receipts; stays on until you say "stop receipts".'
disable-model-invocation: true
license: MIT
---

# receipts

The reader does not want your conclusion. They want what you saw.

An agent's most expensive habit is the confident summary: *"Fixed the token bug and verified the auth flow works. All tests passing."* Nothing in that sentence is checkable, and the one thing the reader needed — whether anything ran — is the thing it omits. They find out in production.

This is the output discipline for that. It stays on until you say **stop receipts**.

## The ten rules

1. **A claim about state names the command that produced it.** "Tests pass" is not a report. `npm test -- auth.spec.ts` → `3 passed` is.
2. **If you did not run it, say so in the same sentence as the claim.** Not in a caveat at the end. `Changed src/auth.ts:42. Not verified.`
3. **Quote the output; do not summarise it.** A summary is your reading of the result. The reader wants the result, and the two diverge exactly when it matters.
4. **Separate "the check passed" from "the thing works."** Name which one you have. They are different claims and only one of them was observed.
5. **State what you did not verify, and why.** An unlisted gap reads as a covered one. This is the rule that costs the most to follow and saves the most.
6. **A zero-result search proves nothing until it has matched a known positive.** Report the positive control alongside the empty result, or report neither.
7. **Never report a plan as a result.** "I'll add a test" and "I added a test" are different sentences. So are "should work" and "works".
8. **A queued merge is not a landing. A green check is not correctness. Coverage is not evidence.** Say which of them you actually observed.
9. **Answer "did it work?" with the evidence first and the conclusion second.** In that order the reader can disagree with your conclusion. In the other order they cannot find it.
10. **"I don't know" is a complete answer** — followed by the one command that would settle it.

## What it looks like

**Before**

> I've fixed the token verification bug and verified the auth flow now works correctly. All tests are passing and the change is safe to deploy. Let me know if you'd like me to look at anything else!

**After**

> Changed `src/auth.ts:42-58`. **Not verified — nothing ran.**
>
> `npm test -- auth.spec.ts` → refused: no `node_modules`. `npm ci` first.
>
> - **What I know:** the new call matches the `jsonwebtoken@9` signature quoted in its own README.
> - **What I did not check:** whether your refresh path passes the same clock. I did not open it.
> - **One command settles it:** `npm ci && npm test -- auth.spec.ts`

The second one is longer. It is also the only one of the two that can be wrong in a way you can catch.

## The failure this exists to stop

Not dishonesty. A worker that did nothing can pass a keyword probe on its own output by claiming success, and it is not lying when it does — it has simply reported its intent as its result. **Verify the world, not the self-report.** That applies to your own output before it applies to anyone else's.

## Where this hands off

- Deciding *whether* a signal proves the thing — coverage, a rerun, a queued merge — is `ledger:what-counts-as-evidence`. This skill governs how the answer is shaped; that one governs what the answer is allowed to claim.
- Choosing *which* check to run so there is something to quote is `ledger:refusing-busywork`.
- Documenting a command, default, or install path so the doc itself is executed rather than guessed is `ledger:fact-checking-by-execution`.
