---
name: refusing-busywork
description: Use when choosing which checks to run before a commit or push; when about to run a full suite or repeat a check that already passed; when trimming prose, deleting code, or archiving records toward a count; or when a refresh, rewrite, or cleanup mechanism exists and you are deciding whether to use it. DO NOT invoke to judge what a passing check proves — route that to ledger:what-counts-as-evidence.
---

# Refusing busywork

Ceremony is the tax a long-horizon loop pays every single iteration, and it compounds exactly like interest. A full suite run that was never needed costs the same on turn 400 as on turn 4 — except by turn 400 it has been paid 400 times.

This skill owns what not to do. It does not judge what a check proves once you have run it.

Most contributor guides say the opposite of this skill. They tell you to run everything, keep everything, and shorten everything. Each of those is a reflex standing in for a judgment, and the judgment is cheap once you know which one to make.

Read `.ledger.yml` for this project's lanes, hooks, and what CI already owns.

## Run the narrowest check that would fail

There is no universal local baseline beyond what the hooks already do. For any change, the question is: **which check would actually fail if this change were wrong?** Run that one. Add broader checks only for surfaces the change genuinely reaches.

- **Never default to the full suite.** Leave repository-wide coverage to CI unless the change is genuinely cross-cutting, or the user asked for it.
- **Never repeat a passing check because a commit or push follows.** In particular, do not run a static check immediately before pushing solely to duplicate a hook that already ran it — read `hooks` in the adapter and skip what it lists.
- **Test selection is not coverage selection.** Running the affected tests and measuring coverage on the affected source are two different decisions; conflating them either over-runs or under-measures.
- Run the whole local approximation only on explicit request, while diagnosing a CI failure, or when the change spans so much that no narrower set is credible.
- A corpus-wide or repository-wide check belongs at the point where the whole change is assembled, not inside each individual edit.

## Return the budget; do not invent headroom

A limit that was set deliberately is information. Treat raising one as a claim requiring evidence, and lowering one as a change to what the project already granted.

- **Restoring a budget is not masking.** Returning a suite to the budget its lane already granted, or sizing a bounded retry to contention actually measured on the runner, names the awaited work and gives back what was allocated.
- Inventing headroom around an unexamined wait *is* masking. The difference is whether you can say what is being waited for.
- Raise the setup and teardown budget together with the case budget. They pay the same contention, so lifting one moves the failure into the other.
- **A ceiling is a guardrail, not a reduction target.** Being under it is not an achievement, and approaching it is not a reason to cut. Leave headroom rather than optimizing toward the line.

## Brevity is not the goal

- **A smaller word count alone is not an improvement.** Removing narration and repetition is; removing a fact is not.
- This is not a one-way shortening pass. Add or restore prose when the code, types, and structure do not communicate a contract that a caller depends on.
- **Do not manufacture edits to satisfy a deletion target**, and do not weaken a statement to make progress.
- Do not force a shorter sentence when precision would fall. Never remove or strengthen "must", "may", "never", a timing constraint, an exception, or a number in order to hit a length target.
- Do not apply a universal length limit to an exhaustive reference. Measure the reader's entry path and retrieval cost instead of the total.
- Do not create a new explanation merely to relocate disposable reasoning. If it was not worth keeping, it is not worth moving.

## No quotas

Counting is a way of avoiding judgment, and it produces confident wrong work.

- **Do not archive, delete, or trim toward a quota.** Age, length, and count are discovery aids, never criteria.
- Prefer a few well-proven candidates over a pile of thin guesses. A short review with one substantiated blocker beats a list of nits.
- Omit findings that a green automated check already enforces — reporting them spends the reader's attention on nothing.
- Do not port duplicate or lower-confidence items forward just to preserve a number.
- Do not let the first good candidate stop a survey, and do not expand a narrow survey into a repository-wide audit because you noticed something adjacent. Both are failures of scope, in opposite directions.

## A mechanism's existence is not a reason to use it

This is the subtlest one, and the most expensive when missed: tools invite the work they are capable of.

- **Do not rewrite branches merely because a refresh mechanism exists.**
- Do not serialize a whole suite because one fixture lacks isolation. Narrow the exclusive scope or fix the allocation.
- Do not rewrite fixed literals — paths, URLs, expected values used only as parser inputs — merely because they look like resources.
- Do not restructure a document to fit a template when the template's assumptions do not apply to it.
- Do not publish, deploy, or expose something because the capability is configured. Deployment, hosting, and public exposure need an explicit request every time.
- Do not install software, add a dependency, or launch a service to work around a missing tool. Report the missing dependency instead.
- Do not add a marker or record for a speculative complaint. A note needs either a decision behind it or a concrete next action.

## Report what you ran, and what you deliberately did not

Name the checks you ran and their observed results. Then name what you skipped and why — "the change does not reach that surface", "the hook already ran it", "CI owns that lane".

Stating the skips is what makes the selection reviewable. An unexplained narrow run looks identical to an oversight.
