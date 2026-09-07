---
name: pushing-safely
description: Use before pushing, force-pushing, or marking a change ready for review; when a push needs history rewritten; when CI reports no checks at all for a pushed commit; or when deciding whether a merge actually landed. DO NOT invoke to select which checks to run first — route that to ledger:refusing-busywork.
---

# Pushing safely

Publishing is where a local mistake becomes everyone's. Three things go wrong here, and each has a specific protocol: a rewrite that eats someone else's commit, a claim that something landed when it did not, and a missing signal misread as infrastructure trouble.

Read `hooks`, `ci`, and `default_branch` from `.ledger.yml`.

## Protect a history rewrite with a lease

Rebasing a feature branch is fine, including after review. Force-pushing without a lease is not.

Before a rewrite: fetch the current remote branch and **record its exact object id**. Then publish against that specific id, so a concurrent update aborts your push instead of silently discarding it:

```sh
git fetch origin <branch>
git rev-parse origin/<branch>          # record this
git push --force-with-lease=<branch>:<observed-oid>
```

**Raw `--force` is never acceptable.** `--force-with-lease` without an explicit object id is weaker than it looks — it leases against your local remote-tracking ref, which a background fetch can have already advanced. Name the id you actually observed.

**After any rewritten push, re-audit.** Fetch the live heads again and re-check unresolved review threads, approvals, mergeability, and checks. Commit hashes and inline-comment anchors recorded before the rewrite are not current evidence — they point at commits that no longer exist.

## Push procedure

1. Run the selected relevant checks **once**.
2. Commit, then inspect any files a commit hook modified before continuing. A hook that reformats your work has changed what you are about to publish.
3. Push — normally, or with the exact lease for an authorized rewrite.
4. Verify the remote ref matches local `HEAD`:

```sh
git rev-parse HEAD "origin/$(git branch --show-current)"
```

That last step is not ceremony. A push can partially succeed, hit a hook rejection, or land on a different ref than you expect, and every downstream claim assumes it worked.

## When CI reports no checks at all

This is the diagnosis worth knowing, because the obvious readings are all wrong.

Your change request says "no checks reported", and querying workflow runs for the head commit returns a count of zero. The instinct is a dropped event, a broken workflow file, or a bad push. Before any of that, **read mergeability**:

```sh
gh pr view <number> --json mergeable,mergeStateStatus
```

A platform creates no change-request workflow runs while the request is **conflicting**. So the absent signal *is* the conflict — not infrastructure, not a dropped webhook, not your push.

**Resolving the conflict is the only fix.** Empty commits, allow-empty pushes, draft/ready toggles, and revert-and-restore bounces all leave the count at zero and add junk history to a branch someone still has to review. When the branch cannot be merged locally yet, confirm the conflicting paths without touching your working tree:

```sh
git merge-tree --write-tree HEAD origin/<base>
```

## Handle failures honestly

If a relevant check fails before a push, stop and fix the blocker or explain it. **Do not push and hope CI differs.**

If a failure looks environment-specific, prove it rather than asserting it:

- record the exact command, the failing case, and the platform-specific mismatch;
- confirm the relevant non-platform evidence still passes;
- prefer fixing cross-platform nondeterminism when the check is required;
- bypass an automated hook **only** when the user explicitly asks or agrees, and then report exactly what failed and why CI is expected to differ.

## Landing is not the same as being accepted

- **A queued merge is not a landing.** Wait for the terminal merged state before saying it landed, and report a queued request as queued.
- Before deleting a branch, confirm nothing still depends on it — check for open change requests targeting it and require the count to be zero. A branch deleted under a dependent request breaks it in a way that is tedious to recover.
- Report pending checks as pending. Inspect a failure before attributing it to the branch or the environment.

For what a green check does and does not prove, see `ledger:what-counts-as-evidence`.
