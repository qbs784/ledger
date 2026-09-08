---
name: refusing-busywork
description: Use when choosing which checks to run before a commit or push; when about to run a full suite or repeat a check that already passed; when trimming prose, deleting code, or archiving records toward a count; or when a refresh, rewrite, or cleanup mechanism exists and you are deciding whether to use it. DO NOT invoke to judge what a passing check proves (ledger:what-counts-as-evidence) or whether an edit is itself right rather than ceremony (ledger:writing-complete-propositions).
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

## When you are about to do it anyway

Knowing the rules above is not the hard part. Arguing past them is, because the argument never arrives as "I will now do something useless" — it arrives as one reasonable sentence, and reasonable sentences are persuasive. **When you catch yourself producing one of these, treat it as the signal that you are about to spend the iteration, not as the reason to spend it.**

| The thought | What is actually true |
|---|---|
| "This change is large, so the full suite is the proportionate response." | Size is not reach. A thousand-line change that touches one surface still has one check that would fail; **cross-cutting means many surfaces, not many lines.** Name the surfaces the change reaches, then check those. |
| "It only takes a minute, and I am pushing anyway." | The minute is charged per iteration, not once. And a check that already passed observes nothing new the second time — repetition adds no information, only latency. Read `hooks.pre_commit` and `hooks.pre_push` from `.ledger.yml` and skip what they list. |
| "I cannot tell which check would catch this, so running everything is the safe answer." | **Not knowing which check would fail is the finding, not a reason to run all of them.** A green full suite does not tell you which surface the change reached, so it hides the gap instead of closing it. Locate the check first; that answer is part of what you report. |
| "The tests passed, so I should confirm with coverage too." | Coverage answers a different question than test selection, and running it here answers neither better. Decide separately whether this change alters what the affected source executes; if it does not, the coverage run is a number you already had. |
| "Raising this timeout would be masking a real failure." | Returning a lane to the budget it was already granted is not masking. **The test is whether you can name what is being waited for.** If you can, it is a budget; if you cannot, no number is the right one and the timeout was never the question. |
| "I cut it by a third, so the document improved." | A third of what? Cutting narration and cutting a contract measure identically, and **the count cannot tell you which one you did.** Judge the edit by what a reader can no longer learn from the page. |
| "That sentence reads tighter without the 'never'." | It reads tighter and it now permits something the project forbids. A shorter sentence that allows more is a different sentence, not a better one — modality, timing constraints, exceptions, and numbers are never traded for length. |
| "One finding makes for a thin review." | A thin review is one with nothing substantiated in it. One proven blocker is a complete review; padding it with nits a green check already enforces spends the reader's attention and buries the blocker under things they cannot act on. |
| "While I am here, I noticed something adjacent — I may as well check the rest." | Record it and finish the scope you were given. Expanding a narrow survey and stopping at the first good candidate are the same failure in opposite directions: both answer a question nobody asked, and both leave the asked one unanswered. |
| "The refresh mechanism exists and the branch is behind, so this is the moment." | A capability is not a trigger. Rewriting history costs everyone holding the old commits, and **"the command was available" is not a reason anyone can review.** Use it when something concrete requires it, and say what that was. |
| "The tool is missing and installing it is one command." | Installing software, adding a dependency, or starting a service changes the environment your results were produced in, and nobody asked for that change. **Report the missing dependency and stop** — a result from an environment you silently altered is worth less than no result. |
| "The deploy target is already configured, so shipping this is implied." | Configuration records that someone once decided how to publish, not that they have decided to publish now. **Deployment, hosting, and public exposure need an explicit request every time**, including — especially — when the pipeline would accept one without it. |

**Red flags.** "just to be safe", "while I'm here", "it only takes a minute", "for completeness", "might as well", "let's be thorough", "one more pass", "since it is already set up". **None of these names a surface the change reaches, a signal you do not already have, or something the user asked for** — which is the whole test. If one of them is your reason, you do not have one.

## Report what you ran, and what you deliberately did not

Name the checks you ran and their observed results. Then name what you skipped and why — "the change does not reach that surface", "the hook already ran it", "CI owns that lane".

Stating the skips is what makes the selection reviewable. An unexplained narrow run looks identical to an oversight.
