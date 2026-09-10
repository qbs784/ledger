---
name: specifying-acceptance
description: Use when writing or reviewing acceptance criteria, a definition of done, or the exit conditions for a piece of work; when a requirement reads as an adjective rather than something observable; or when declaring what a component's behavior means. DO NOT invoke to judge whether a guard already written can fail — route that to ledger:proving-the-regression. DO NOT invoke to judge what an already-green signal proves — route that to ledger:what-counts-as-evidence.
license: MIT
---

# Specifying acceptance

**A criterion you cannot name one assertion for is not a criterion.** It is a
hope about the outcome, and it will be marked satisfied by whoever wants to be
finished.

This skill owns the form a criterion has to take before work starts against it.
It does not judge whether a check that already exists can fail.

Acceptance written after the fact describes what was built. Acceptance written
before is the only version that can reject anything, which is why the form
matters more here than anywhere else in the change.

## Find the criteria before asking for them

A message saying the criteria are here almost always means they are in the
repository — a requirements document, an issue, a design note — and the first
move is to go and read them. Asking whoever sent you to paste what is already
on disk spends their turn and reports an absence you never checked.

The same applies to the code the criteria describe. A criterion's nearest
wrong reading is usually **already resolved in the implementation**, silently
and in one direction; you cannot see which until you read it. Naming the
ambiguity without checking what the code already chose is the weaker half of
the finding.

If a listing comes back empty, that is a claim like any other: confirm it with
a second command that would have matched something, and say where you looked
before saying nothing is there.

## The form

Three parts, and a criterion missing any one of them cannot be tested:

- **the trigger** — the condition under which the claim applies;
- **the subject** — what does the responding;
- **the observable response** — what an outside party can see happen.

"The exporter is reliable" has none of them. "When the upstream returns a
5xx, the exporter shall record the batch in the dead-letter table and exit
non-zero" has all three, and the assertion that satisfies it is already
visible in the sentence.

**Observable means observable from outside the subject.** A response phrased as
an internal state — a flag set, a method called, a field populated — is
satisfied by an implementation that sets the flag and does nothing else. Name
the artifact, the exit code, the row, the emitted event, the file on disk.

## Adjectives are not criteria

Fast, robust, reliable, secure, maintainable, performant, intuitive. Each of
these is a category, not a claim, and a category cannot be red.

Every non-functional criterion needs three things stated with it: **who
measures, what number they read, and the threshold that fails.** Without them
the criterion is decorative, and it will be declared met by the person whose
work it was supposed to constrain.

If the number cannot be produced yet, that is a finding worth recording — an
honest "no measurement exists for this" is checkable, and an adjective is not.

## Declaring a semantic is not evidence

Writing what something means — in a plan, a docstring, a decision record, a
delivery report — establishes nothing about what it does. This is the most
expensive failure in this skill's area, because the writing feels like the
work.

The shape it takes: the same meaning is stated in three places, the
implementation does something adjacent to it, and every check is green because
no check distinguishes the two. It survives review because a reader comparing
the code against the sentence finds them compatible.

So a declared semantic ships with **two** things, in the same round:

1. **A case that discriminates this meaning from the nearest wrong one.** Not
   a case that exercises the behavior — one that comes out differently under
   the two readings. A behavior-level case that passes under both meanings has
   told you nothing, and it is the common outcome: the values chosen for it
   are usually the ones where the readings agree.
2. **A mutation proving that case is what holds the meaning.** Break the
   implementation in the direction of the wrong reading and watch the case go
   red.

Missing the first is a claim with nothing behind it. Missing the second is
believing the case will fail rather than having seen it. Neither substitutes
for the other: the discriminating case does the work, and the mutation is the
proof it does. `ledger:proving-the-regression` owns the mutation half once a
check exists; this skill owns getting the discriminating case named before
anything is built.

**Naming the nearest wrong meaning is the whole technique.** "The timestamp
recorded when the state was entered" and "the timestamp of the most recent
sample" are compatible with the same sentence, the same tests, and different
behavior. Write the second one down, then design the case that separates them.

## Before the work starts

For each criterion, answer both:

- **Which assertion satisfies this, and where would it live?** No answer means
  the criterion is not yet one.
- **What is the nearest meaning this could be read as instead?** If nothing,
  say so — but the question is asked, not skipped, because the readings that
  cause damage are the ones nobody thought were available.

## When you are about to accept it anyway

| The thought | What is actually true |
|---|---|
| "Everyone knows what 'handles errors gracefully' means here." | Everyone has a reading and they differ, which surfaces at acceptance when it is expensive. One assertion, or it is not a criterion. |
| "The test exercises this behavior, so it is covered." | Exercising is not discriminating. Ask which competing reading that test would come out differently under; if the answer is none, it covers neither. |
| "I wrote what it means in three places, so it is unambiguous." | Three statements of a meaning are one statement repeated. What makes it real is a case that fails when the code drifts to the neighbouring meaning. |
| "The measurement can be worked out during implementation." | The implementer will pick the measurement that their implementation passes. That is not dishonesty, it is the only measurement they can see from there. |
| "It is a non-functional requirement, so a number is not realistic." | Then the criterion is that no threshold exists, and it is not an acceptance criterion. Record it as an open question rather than as a bar the work will be judged against. |

## Report

For each criterion: its three parts, the assertion that satisfies it and where
it will live, and the nearest wrong reading you named. Where a criterion could
not be brought to this form, say which one and what is missing — a criterion
left as an adjective is a gate that will pass no matter what is built, and
saying so is more useful than restating it.
