---
name: metabolizing-knowledge
description: Use when asked whether something delivered earlier still holds, when closing a milestone or running a periodic sweep over what was already marked verified, or when the set of live claims has grown too large to read and dead entries need retiring. DO NOT invoke to add, audit, or retire a decision record — route that to ledger:curating-decision-records. DO NOT invoke to propose removing code — route that to ledger:proving-code-is-dead.
license: MIT
---

# Metabolizing knowledge

Every other discipline here produces knowledge. Qualifying a request produces
a decision, planning produces a table, a unit produces a verified claim, a
scenario produces a validated story. **None of them reclaims any of it**, so
the set only grows, and what it grows with is claims that were true once.

This skill owns one question: **when does something already marked verified
stop being true?** It does not curate decision records, and it does not argue
for deleting code.

The reason this is a discipline rather than a cleanup is that nothing raises its
hand. A requirement whose test was deleted still reads as satisfied. A guard
whose implementation was refactored away still has its entry. Left alone the
record does not go noisily wrong — it goes quietly wrong, and the day someone
relies on it is the day they find out.

## Nothing here works without provenance

The handle is a registry linking each claim of completion to the check that
verifies it and to the artifact recording that check passing.
`traceability.registry`, `traceability.provenance` and `traceability.archive`
in `.ledger.yml` name where those live.

**A missing adapter is not a reason to do nothing here.** Auditing needs the
registry, and a registry can be found: look for it, and if the project keeps
one under another name, say which file you are treating as it and why. What
genuinely stops on a missing value is **re-verification**, because that has to
run this project's checks — there, name the value you do not have rather than
guessing a command.

Where no registry exists at all, that is the finding, and it is the largest one
available: every claim of completion in the project rests on the word "done"
appearing somewhere. Say so, say where you looked, and say what registering
even one batch would buy.

**The artifact is one a run produced by itself.** A report a test runner wrote,
not a checklist a person maintains. The distinction is the whole mechanism: a
hand-maintained list of what passes is a restatement of intent, and it stays
green through anything.

## Audit

Sort every entry into three states, and the third is the one that matters:

- **verified** — a linked check exists, and provenance records it passing.
- **linked but unverified** — a check is named and no artifact records it
  passing. This is not a small gap; nothing has ever been observed here.
- **unlinked** — claimed complete with no check named at all. **Start here.**

Then look for staleness, which has **three forms, and only one of them is a
date**:

1. **The referent moved.** The symbol, path or field the entry points at has
   been renamed or removed. Update the reference or re-verify — but the entry
   as written is already false.
2. **The verification is old.** Past whatever interval this project decided,
   nobody has re-run it. That is a claim about the past presented as a claim
   about now.
3. **The artifact is older than the source.** The code changed after the last
   run that recorded a pass. **That is a stale green**, and it is the most
   dangerous of the three because every dashboard shows it as fine. Re-run
   before reading anything into it.

## Re-verify, and downgrade out loud

Produce fresh provenance **first**, then re-run the checks for entries claiming
verified. Reading yesterday's artifact tells you what was true yesterday.

An entry that does not come back green is **downgraded, visibly, and with a
record of the downgrade**. Not edited quietly, not left alone until someone has
time. A silent downgrade is worse than a stale entry, because the stale one at
least still says something checkable.

Confirm the transition is one the entry's lifecycle allows before making it.
Assigning a state directly is how a record ends up in a combination nothing
else knows how to read.

## Retire by moving, never by deleting

Read `traceability.archive` from `.ledger.yml`. A superseded requirement, a
snapshot of how something used to work, a decision that no longer applies:
each moves out of the live set and stays readable, and restoring it stays
possible.

Deleting it destroys the only account of why it was ever written, and that
account is what stops the next person re-deriving it from scratch — or
re-making the mistake it records.

**Do not retire toward a number.** Age, size and count are how you find
candidates; whether an entry still has a reader is the only criterion. That is
the pack's fifth rule, and it applies here with particular force because a
shrinking list feels like progress.

## The loop spins unless the set keeps growing

This is the failure that makes the whole discipline decorative, and it is
invisible: re-verification runs against whatever was registered when someone
first set it up, reports green every time, and guards nothing that has been
built since.

So the set of entries under re-verification is **append-only**:

- **Hard cadence.** Closing a batch of work registers that batch's claims
  before the batch is called done. Not afterwards, and not from memory.
- **Soft cadence.** A periodic sweep does the audit and looks for staleness, and
  needs no one present.
- **Take the backlog in slices.** Registering years of existing claims at once
  turns the whole thing red on day one, and a gate that is entirely red gets
  switched off. New work always, plus a few old entries per pass.

## What this does not claim

The criteria here are deterministic — an artifact exists or it does not, a
symbol resolves or it does not, one file is newer than another or it is not.

It does **not** follow that the result is trustworthy against a participant
that wants it green. Nothing in this skill detects an artifact produced by a
check written to pass, and it does not try. That protection comes from the
review being independent and the assertions consuming real state, in
`ledger:reviewing-as-cis-complement` and `ledger:proving-the-regression`.

## Report

The regressions, named: entries that claimed verified and did not come back
green. The staleness findings by form, because the three call for different
work. The entries retired and where they went. And, when anything regressed,
finish on a signal a caller can act on rather than a summary a reader has to
interpret.
