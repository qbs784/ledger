---
name: scoping-a-change
description: Use when starting work on a change, before reading or reviewing a diff, or before deciding what a change affects — any time you need to know exactly which files it touches. Also use again after merging or retargeting onto a new base. DO NOT invoke to choose which checks to run over that scope — route that to ledger:refusing-busywork.
---

# Scoping a change

Every later decision — which checks to run, which surfaces to review, what evidence a claim needs — is computed from the change set. Get the change set wrong and every one of those decisions is wrong in a way that looks fine.

**The branch's tracking ref is not the base.** It is wrong for a branch created fresh from a worktree, wrong for a branch whose change request targets another feature branch, and wrong again after anyone merges. Inferring it is the single most common way an agent ends up reviewing the wrong diff and running the wrong checks with total confidence.

## Resolve the base explicitly

1. Confirm where you are:

```sh
git status --short --branch
git rev-parse --show-toplevel
```

2. Determine the base from **observed** state, not from a naming convention: the change request's declared target branch, or the parent in a dependency chain. Read `default_branch` from `.ledger.yml`, and verify against the remote rather than assuming the local ref is current.

3. Fetch that ref, then compute the scope against it. Never let a scoping tool guess or auto-fetch a base — a tool that picks a base silently moves the error from you to the tool.

## Report four layers separately

Committed paths, staged paths, unstaged paths, and untracked paths answer different questions, and collapsing them hides real problems.

- **Committed** paths are relative to the resolved merge base: this is what a reviewer sees.
- **Staged, unstaged, and untracked** paths describe your current working tree: this is what is not yet anywhere else.

An untracked file is the one that bites. It is part of the change in every practical sense and part of the diff in none, so a scope that omits it produces checks that pass locally and a change request that is missing a file.

[scripts/change-scope.sh](scripts/change-scope.sh) computes all four from a base you supply, using nothing but `git`:

```sh
./scripts/change-scope.sh <verified-base-ref>
```

It refuses to run without an explicit base, by design.

## Re-scope when the base moves

After merging or retargeting onto a changed base: recompute the scope, reassess which behavior the **combined** scope can affect, and re-run only the checks the merge invalidated.

Do not carry a pre-merge scope forward. A merge can bring in a change that makes your untouched code wrong, and the diff you already read will not show it.

## What the scope is for

Hand the result to the next decision rather than acting on it directly:

- selecting the narrowest sufficient checks — `ledger:refusing-busywork`;
- deciding what a review must cover — `ledger:reviewing-as-cis-complement`;
- knowing which documentation claims a change invalidated — `ledger:fact-checking-by-execution`.

## Report

State the base ref you resolved and **how you verified it**, then the four layers. If you could not verify the base, say so and stop rather than proceeding on a guess — an unverified base is not a small imprecision, it is a wrong answer to every question that follows.
