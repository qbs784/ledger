# The dispatch brief

What travels to a delegated unit, and what comes back. Referenced from
[the site decision](../SKILL.md#where-each-unit-runs): delegating more work
means more of what the unit needs has to survive the handoff in writing, and a
badly briefed worker goes confidently the wrong way.

## The brief is the requirements

Write the unit's full requirements to a file, and let the dispatch point at it.
**Exact values — numbers, identifiers, signatures, the cases that must pass —
appear in the brief and nowhere else.** A value restated in the dispatch
message is a second copy that will disagree with the first.

The dispatch itself carries five things and nothing else:

1. one sentence on where this unit sits in the whole;
2. the brief's path, introduced as the requirements, to be used verbatim;
3. interfaces and decisions from earlier units that the brief could not know;
4. your resolution of any ambiguity you noticed in the brief — you saw it, so
   it is yours to settle, not theirs to discover;
5. the path the report is written to, and what the report must contain.

## What must not travel

- **Accumulated history.** A fresh agent needs its unit, the interfaces it
  touches, and the constraints that bind everything. Not a summary of what the
  previous units did. Pasted history is the single largest avoidable cost in a
  dispatch, and it is invisible because it feels like context-setting.
- **Artifacts pasted inline.** A diff, a log, a file listing — anything pasted
  into a prompt stays in the sender's context for the rest of the session and
  is replayed on every later call. Write it to a file and send the path.
- **Permission to delegate again.** A delegated unit does not dispatch its own
  reviewer. It will, if allowed, and the result duplicates the review that was
  going to happen anyway at full price.

## What comes back

The full account goes to the report file. The reply carries only: status, what
was committed, a one-line test summary, and concerns. Anything longer is
re-entering your context to be replayed forever.

Four statuses, each with a different response:

| Status | What it means | What to do |
|---|---|---|
| **done** | the unit is complete | package the diff as a file and send it to review |
| **done, with concerns** | complete, and the worker flagged doubt | read the concerns first. Correctness or scope: settle before review. An observation: note it and proceed |
| **needs context** | information was missing from the brief | supply it and re-dispatch. The gap was yours |
| **blocked** | it cannot finish | diagnose before retrying: missing context, insufficient capability, a unit too large, or a defect in the plan itself |

**Never re-dispatch a blocked unit unchanged.** If the worker says it is stuck,
something has to be different — more context, a more capable model, a smaller
unit, or a corrected plan. Sending the same brief to the same configuration is
paying twice for one answer.

## The diff goes to review as a file

Review needs the commit list, the change summary, and the full diff with
surrounding context, in one artifact the reviewer opens itself. Compute it from
**the commit recorded before the unit started**, not from the last commit — the
latter silently drops everything but the final commit of a multi-commit unit,
and the review then covers a fraction of the work while reporting on all of it.

## What the reviewer is not told

Do not pre-judge findings. An instruction not to flag something, not to treat
something as a defect, or that a choice was already settled, removes the one
thing the review was for. If you believe a finding would be wrong, let it be
raised and settle it afterwards on the record. A prompt containing "do not
flag" is a prompt written to avoid a review loop.
