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

## Status: authored, schema-checked, not yet executed

**These cases have never been run.** `claude plugin eval` is gated to early access and reports `plugin eval is currently in early access` on this machine, so nothing here has produced a score.

The first draft predicted that field names would need fixing before descriptions did. That prediction was correct, and three defects have since been repaired against the runner's own schema definition:

- every case was missing the required `schema_version`, which a pre-validation guard rejects outright;
- every grader spelled `arm: with_only`, where the schema is `enum(["with-only", "both"])`;
- both near-miss negatives set `max: 0` with no `min`, leaving an unsatisfiable range — a file that would have parsed green and never been satisfiable.

The positive graders now carry no `arm` at all, because a `tool_used: Skill` grader is treated as a plugin-fired indicator on its own. The negatives carry `arm: both`, because an assertion that a skill must *not* load has to be scored in both arms to mean anything.

What remains unverified is everything execution would tell you: whether the cases run, whether the graders bind as intended, and whether any of the 16 descriptions actually triggers. **Verification owner:** anyone with `plugin eval` access — one run answers all three.

When they do run, the numbers decide whether a description needs work, not a reading of the description text.
