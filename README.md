# ledger

**The engineering ledger for agent-authored codebases — every claim has an entry, every entry can be checked.**

Long-horizon agent development does not fail on bad commits. It fails on silent rot: prose stops describing the code, rules go unenforced, dead surface becomes undeletable because nobody can prove it is dead, and claims pile up that nobody can check. Every one of those is invisible at the change that causes it and expensive at the hundredth.

`ledger` is a Claude Code plugin of 16 skills that keep those four things from happening.

## Five pillars

**1. Documentation is the substrate, not the byproduct.** For a human team, docs are a courtesy. For an agent working across sessions that share no memory, they *are* the working memory. So every fact gets exactly one home — standing contracts in the always-loaded instruction file, rationale in dated decision records, procedure in the workflow document, enforcement in a named check — and **when a rule becomes mechanical it is promoted into the check and deleted from the prose.** Documentation is fact-checked by execution: the only admissible evidence for an operation claim is having run it.
→ `writing-complete-propositions`, `fact-checking-by-execution`

**2. Agent-native by construction.** Written for the case where a model is the author, not adapted from human practice — because the failures are different. A model's prose systematically carries the authoring session's viewpoint. A model accretes speculative surface fast and evenly. And a model will report success. Each of those gets a skill; none of them has a human-practice equivalent that transfers.
→ `trimming-session-vantage`, `what-counts-as-evidence`, `proving-code-is-dead`

**3. Loop engineering: each iteration cheap and true.** A long-horizon loop dies of wasted turns, and ceremony compounds like interest — a full suite run that was never needed costs the same on turn 400 as on turn 4, except by then it has been paid 400 times. Compute the change set from a base you *verified* rather than inferred. Run the narrowest check that would actually fail. Then stop.
→ `scoping-a-change`, `refusing-busywork`

**4. Long-horizon automation needs a durable record.** A reader 500 turns or six months later must be able to resolve every reference and re-derive every decision. That means decision records retained by remaining future value — never by age, length, or a cleanup quota — a supersession audit performed *while* the replacement is written, and a retired tier made immutable by content hash rather than by convention.
→ `curating-decision-records`, `recording-ui-evidence`

**5. Rot resistance as a build requirement, not a cleanup task.** Pin the absence of dead values, so a stale reference fails a check instead of aging quietly. Prove code is dead before deleting it. Prove a guard can fail before trusting it.
→ `proving-the-regression`, `designing-concurrent-tests`, `diagnosing-flakes`, `reviewing-as-cis-complement`, `pushing-safely`

## The seven rules

1. **Narrowest sufficient evidence.** Run the check that would actually fail. Never the full suite by reflex.
2. **Never fake a green.** No suppressing empty results, no lowered thresholds, no narrowed scope to hide a file.
3. **Return the budget; do not invent headroom.** Restoring a limit already granted is not masking. Widening an unexamined wait is.
4. **Brevity is not the goal.** A smaller word count alone is not an improvement.
5. **No quotas.** Age, length, and count are discovery aids, never criteria.
6. **A green signal is not evidence.** Coverage is not correctness. A passing rerun proves nothing. A queued merge is not a landing. A zero-hit search proves nothing until it has matched a known positive.
7. **A mechanism's existence is not a reason to use it.** Tools invite the work they are capable of.

Most contributor guides say the opposite of several of these. They tell you to run everything, keep everything, and shorten everything — each a reflex standing in for a judgment.

## Verify the world, not the self-report

> An assertion must re-run the command or re-read the file **externally**, and confirm that files it did not intend to touch are byte-identical.

Not because that is tidier, but because **a keyword probe on a worker's own output lets a worker that did nothing pass by claiming success.** When the worker is a model that produces a confident summary either way, the summary is not the evidence — it is a claim *about* the evidence, and the two come apart silently.

This is the single rule that most distinguishes an agent-authored codebase from a human one, and it generalizes past tests: it is why documentation is fact-checked by execution, why a guard needs a negative control, and why "it passed" is reported with what actually ran.

## What this is not

- It does **not** prescribe a development workflow. No brainstorm-then-spec-then-implement loop.
- It does **not** choose your architecture, language, or tooling.
- It does **not** generate code.

It governs what the codebase and its records must be able to prove. That composes with whatever workflow you already use.

## Proven in production

Extracted from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), a large agent-authored codebase, rather than designed in the abstract. Figures measured at extraction:

| | |
|---|---|
| merge commits recording a merged pull request | 1,302 |
| active decision records | 658 implemented, 27 proposed, 9 rejected |
| retired records, content-sealed | 175 |
| governing skill prose | 2,412 lines / 26,739 words |

Every rule here traces to a commit, a postmortem, or a decision record — **including the reversals**, which is the part that makes the rest credible. Two examples:

- A review requirement about runtime-invariant companions stood as authoritative and **wrong** for four weeks. Commit `15f2997b` inverted it, removing the companion from **237 packages** in one change: 1,407 files, 11,398 deletions. The rule that replaced it — a check must compare *independently produced* observations, or be omitted with a stated reason — is pillar 5.
- Two documentation skills in that corpus went semantically stale and had to be retired. Both failed the same way: **they named machine values that had since moved**, while every automated check stayed green the entire time. That is why no skill in this pack names a command.

## Install

```sh
claude plugin marketplace add qbs784/ledger
claude plugin install ledger@ledger
```

Or run it from a clone:

```sh
git clone https://github.com/qbs784/ledger
claude --plugin-dir ./ledger
```

The skills are plain directory bundles with `name` + `description` frontmatter and relative resource paths, so they also load unchanged from a project's `.claude/skills/` or `.agents/skills/`, or from `~/.claude/skills/`.

## The adapter: no skill names a command

Disciplines are general; the commands that implement them are not. A skill that hardcodes `run-the-tests` goes stale the moment the project moves — silently, because nothing checks prose. So every project-varying value lives in one file at your repository root, `.ledger.yml`, and the skills read it: test lanes, what CI already owns, which hooks already run, production and non-production source globs, and the **protected seams** a removal proposal must out-argue.

Start with `adapting-to-a-project`. It writes that file — and it runs every command before recording it, because a wrong entry is worse than a missing one: a missing entry makes a skill stop and ask, while a wrong entry makes it run something and believe the result.

This separation is enforced, not just intended. `tests/drift-gate.mjs` fails if any skill's prose names a project-specific referent, if the router omits a shipped skill or routes to one that does not exist, if a bundled reference file is never named by its `SKILL.md` (the model is handed a base directory, not a listing — an unnamed file is unreachable), or if a description exceeds the length at which catalogs truncate it. Run `node tests/drift-gate.mjs --self-test` to watch it reject eight planted defects; a gate not shown to fail is not a gate.

## Skills

| Skill | Reach for it when |
|---|---|
| `using-ledger` | starting out, or unsure which skill applies |
| `adapting-to-a-project` | setting up in a new repository |
| `what-counts-as-evidence` | about to state that something works, passes, or is done |
| `refusing-busywork` | choosing checks, or about to repeat one that passed |
| `scoping-a-change` | working out what a change actually touches |
| `proving-the-regression` | adding a guard; asserting a fix works |
| `designing-concurrent-tests` | a test touches ports, files, env, clocks, or teardown |
| `diagnosing-flakes` | a test fails intermittently |
| `writing-complete-propositions` | writing or editing any prose, anywhere |
| `fact-checking-by-execution` | documenting a command, default, error, or install path |
| `trimming-session-vantage` | prose reads like a leaked reasoning transcript |
| `proving-code-is-dead` | deleting code, or swapping in a dependency |
| `curating-decision-records` | adding, auditing, or retiring decision records |
| `reviewing-as-cis-complement` | reviewing a change, or answering review |
| `pushing-safely` | pushing, force-pushing, or checking whether it landed |
| `recording-ui-evidence` | recording a UI demo as visual evidence |

### Always-on router

`optional/` ships a `SessionStart` hook that injects the router into every session. It is **inert by default** — an always-on injection is a cost every session pays whether the work needs it or not. Enable it by copying `optional/hooks.json` and `optional/inject-router` into a `hooks/` directory at the plugin root.

Prefer measuring first: `evals/` holds trigger cases with near-miss negatives, and under-triggering is the failure the hook exists to fix.

## 中文简介

**面向 agent 主笔代码库的工程账本 —— 每个主张都有条目，每个条目都可核查。**

长程 agent 开发不是死于坏提交，而是死于**静默腐化**：散文不再描述代码、规则无人强制、死代码因无人能证明其已死而不敢删、主张堆积到无人能核查。每一种都在发生时看不见，在第一百次时变得昂贵。

五支柱：**文档即基底**（一个事实一个家；规则一旦机械化就晋升进检查并从散文里删掉；文档靠执行核查）、**Agent 原生构造**（模型的散文系统性带着作者会话视角，模型积累投机表面积又快又匀，模型会声称成功）、**Loop 工程**（从验证过的基准算改动集，只跑会因这个回归失败的最窄检查，然后停手）、**长程自动化需要可存续记录**（按剩余决策价值留存，写替代时当场做 supersession 审计，退役层用内容哈希封存）、**防腐化是建造要求**（钉住死值的缺席，删之前先证明已死）。

最核心的一条：**Verify the world, not the self-report** —— 断言必须**从外部**重跑命令或重读文件，并确认未打算触碰的文件逐字节相同。理由不是这样更整洁，而是**对 agent 自己的输出做关键词探测，会让什么都没做却声称成功的 agent 通过**。

它**不**规定开发工作流、**不**替你选架构、**不**生成代码；它管的是代码库及其记录必须能证明什么。

安装见上方 Install。所有项目专属命令都在 `.ledger.yml` 里，skill 正文一个命令都不写 —— 这条由 `tests/drift-gate.mjs` 强制，不只是约定。

## Attribution and license

MIT. Derived in part from the agent-instruction corpus of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), which is MIT-licensed; see [LICENSE](LICENSE) for both notices.
