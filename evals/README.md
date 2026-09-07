# Trigger evals

A skill in a plugin has no always-loaded instruction file behind it. Its `description` is the entire trigger surface, which makes description quality a measurable property rather than a matter of taste — and the failure mode is under-triggering, silently, on exactly the tasks the skill was written for.

These cases measure that. Each pairs a realistic prompt with `tool_used` graders asserting which skill loads, and several assert a **near-miss negative** — a skill that must *not* load, because the prompt sits just outside its boundary. Near-miss negatives are the ones that matter; an obviously-irrelevant negative passes for free and measures nothing.

The six cases target the boundaries most likely to be confused:

| Case | Must load | Must not load |
|---|---|---|
| `flake-investigation` | `diagnosing-flakes` | — |
| `new-fixture-isolation` | `designing-concurrent-tests` | `diagnosing-flakes` |
| `narrow-check-selection` | `refusing-busywork` | — |
| `claiming-done` | `what-counts-as-evidence` | — |
| `change-narration-cleanup` | `trimming-session-vantage` | — |
| `shorten-a-readme` | `writing-complete-propositions` | `trimming-session-vantage` |

Run them from the repository root:

```sh
claude plugin eval . --no-publish
```

The runner adds a no-plugin baseline arm by default and reports the score delta, so a case that would have been answered just as well without the pack shows up as a small delta rather than as a pass.

## Status: authored, not yet executed

**These cases have never been run.** `claude plugin eval` is gated to early access and was unavailable on the machine where they were written, so the only verification they have is that each file is valid YAML and that its fields match the runner's schema.

That means the field names and the `arm: with_only` value are derived from the runner's own schema definition rather than confirmed by a successful run. Treat the first execution as part of authoring: expect to fix field names before expecting to fix descriptions.

Once they do run, the numbers — not a reading of the description text — decide whether a description needs work.
