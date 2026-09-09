# The method behind the pack

The README shows what changes in the next answer. This is the longer argument: why these skills exist, what they were extracted from, and the one rule the rest hang off.

## Verify the world, not the self-report

> An assertion must re-run the command or re-read the file **externally**, and confirm that files it did not intend to touch are byte-identical.

Not because that is tidier, but because **a keyword probe on a worker's own output lets a worker that did nothing pass by claiming success.** When the worker is a model that produces a confident summary either way, the summary is not the evidence — it is a claim *about* the evidence, and the two come apart silently.

This is the single rule that most distinguishes an agent-authored codebase from a human one, and it generalizes past tests: it is why documentation is fact-checked by execution, why a guard needs a negative control, and why "it passed" is reported with what actually ran. `receipts` is that rule applied to every sentence you write.

## Five pillars

**1. Documentation is the substrate, not the byproduct.** For a human team, docs are a courtesy. For an agent working across sessions that share no memory, they *are* the working memory. So every fact gets exactly one home — standing contracts in the always-loaded instruction file, rationale in dated decision records, procedure in the workflow document, enforcement in a named check — and **when a rule becomes mechanical it is promoted into the check and deleted from the prose.** Documentation is fact-checked by execution: the only admissible evidence for an operation claim is having run it.
→ `writing-complete-propositions`, `fact-checking-by-execution`

**2. Agent-native by construction.** Written for the case where a model is the author, not adapted from human practice — because the failures are different. A model's prose systematically carries the authoring session's viewpoint. A model accretes speculative surface fast and evenly. And a model will report success. Each of those gets a skill; none of them has a human-practice equivalent that transfers.
→ `trimming-session-vantage`, `what-counts-as-evidence`, `proving-code-is-dead`, `receipts`

**3. Loop engineering: each iteration cheap and true.** A long-horizon loop dies of wasted turns, and ceremony compounds like interest — a full suite run that was never needed costs the same on turn 400 as on turn 4, except by then it has been paid 400 times. Compute the change set from a base you *verified* rather than inferred. Run the narrowest check that would actually fail. Then stop.
→ `scoping-a-change`, `refusing-busywork`

**4. Long-horizon automation needs a durable record.** A reader 500 turns or six months later must be able to resolve every reference and re-derive every decision. That means decision records retained by remaining future value — never by age, length, or a cleanup quota — a supersession audit performed *while* the replacement is written, and a retired tier made immutable by content hash rather than by convention.
→ `curating-decision-records`, `recording-ui-evidence`

**5. Rot resistance as a build requirement, not a cleanup task.** Pin the absence of dead values, so a stale reference fails a check instead of aging quietly. Prove code is dead before deleting it. Prove a guard can fail before trusting it.
→ `proving-the-regression`, `designing-concurrent-tests`, `diagnosing-flakes`, `reviewing-as-cis-complement`, `pushing-safely`

## Extracted, not designed

Taken from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), a large agent-authored codebase, rather than designed in the abstract. Figures measured at extraction:

| | |
|---|---|
| merge commits recording a merged pull request | 1,302 |
| active decision records | 658 implemented, 27 proposed, 9 rejected |
| retired records, content-sealed | 175 |
| governing skill prose | 2,412 lines / 26,739 words |

Every rule traces to a commit, a postmortem, or a decision record — **including the reversals**, which is the part that makes the rest credible. Two examples:

- A review requirement about runtime-invariant companions stood as authoritative and **wrong** for four weeks. Commit `15f2997b` inverted it, removing the companion from **237 packages** in one change: 1,407 files, 11,398 deletions. The rule that replaced it — a check must compare *independently produced* observations, or be omitted with a stated reason — is pillar 5.
- Two documentation skills in that corpus went semantically stale and had to be retired. Both failed the same way: **they named machine values that had since moved**, while every automated check stayed green the entire time. That is why no skill in this pack names a command.

## The separation is enforced, not intended

`tests/drift-gate.mjs` fails if any skill's prose names a project-specific referent, if the router omits a shipped skill or routes to one that does not exist, if a bundled reference file is never named by its `SKILL.md` (the model is handed a base directory, not a listing — an unnamed file is unreachable), or if a description exceeds the length at which catalogs truncate it. Run `node tests/drift-gate.mjs --self-test` to watch it reject 21 planted defects; a gate not shown to fail is not a gate.

## The always-on router, and why its justification did not survive

`hooks/hooks.json` injects the router into every session, and it is on by default. That default was set on the strength of a measurement, and the measurement was wrong. A clean board, 15 cases at three runs each with both arms in one pass:

| | Runs that produced the right answer | Runs where the intended skill loaded |
|---|---|---|
| with the injection | 34 of 42 — 81% | 50 of 54 — 93% |
| descriptions alone | 36 of 44 — 82% | 44 of 53 — 83% |

**No benefit was detected.** Paired by case: two better, two worse, eleven unchanged; sign test p = 1.0. Three of the 45 injected runs also exhausted their turn budget and produced no answer, against none of the 45 without it. Earlier versions of the README claimed a large significant gain; that came from boards contaminated three ways, and every one of the three errors flattered this pack. [evals/README.md](../evals/README.md) lists them.

At this size the corpus cannot see an effect smaller than about twenty points, so **not detected is not the same as absent**. Settling it needs roughly 200 runs per arm. Until then treat the injection as an unproven cost of about 1,800 tokens per session. To switch it off: delete `hooks/` from your installed copy, or point the plugin's `hooks` manifest path at something that does not exist. The router stays reachable by name either way, and the hook degrades to silence rather than breaking a session — a missing interpreter, a missing router file, or any read failure exits 0 with no output.

**The router and `receipts` are the two skills the model cannot invoke.** Both carry `disable-model-invocation: true`: a router's description is a summary for a person choosing a command, not trigger vocabulary for a model, and an output style is something you turn on deliberately rather than something that should fire on its own.
