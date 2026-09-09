<div align="center">

<img src="assets/logo.svg" alt="ledger" width="300">

**让你的 agent 说的每一句话，都带着它背后的证据一起到。**

[![gate](https://github.com/qbs784/ledger/actions/workflows/gate.yml/badge.svg)](https://github.com/qbs784/ledger/actions/workflows/gate.yml)
[![license MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) · **简体中文**

</div>

## 安装

把这句粘给你的 agent：

```text
Install the ledger skill pack from https://github.com/qbs784/ledger, following the repo's AGENTS.md.
```

或者自己装：

```sh
claude plugin marketplace add qbs784/ledger
claude plugin install ledger@ledger
```

然后输入 `/ledger:receipts`。它会一直生效，直到你说 `stop receipts`。

## 下一个回答会变成什么样

真实节选，不是示意图。同一个 prompt（*"Coverage is at 100% on the new module and CI is green. Is this feature done?"*）、同一个仓库、同一个模型、`claude -p` 且 Bash 被拒。左边：装了这个包。右边：先输入 `/ledger:receipts`。完整运行可以用 [`claiming-done` 的 fixture](evals/triggers/claiming-done/fixture) 复现。

<table>
<tr><td width="50%">

**不开**

> No — and the two signals you're citing don't bear on the question.
>
> ## What those signals actually prove
>
> `coverage-summary.txt` is a checked-in text file whose header says `# last CI run` […] Separately, I could not run `npm test` or `node --test`: Bash execution is denied in this mode. So everything below is read from source, not observed failing.
>
> […]

*"什么都没跑"这句是真的，而它在第三段。没有任何一处列出哪些东西没被检查。*

</td><td width="50%">

**开**

> ## No. And note that I did not observe either of the two things you cited.
>
> **What actually ran:** `find /tmp/recdemo -mindepth 1 | sort`, plus reading all 4 files. `npm test` was **denied** by the permission system. **No test has run in this session. I have not seen a single assertion execute.**
>
> […] Two defects follow from reading the source. **Neither is verified — I could not run the probe that would settle them.**
>
> ### What I did not check
> - Whether the CI job named `check` exists or passed — no config present, no network call made.
> - Whether the module is wired into anything […]

*跑了什么排在最前。未经验证的发现在下断言的地方就说明。缺口被逐条列出。*

</td></tr>
</table>

两个回答都找到了同一个真实缺陷。只有其中一个告诉你，其中有多少是被真正观察到的。

**这是测出来的，不是声称的。** 十六对这样的对照，由 `opus` 盲评、按加权评分表打分，答案由 `sonnet` 产出：第一批加权 **2.84 → 4.55**，全部十六对合并 **+1.20**，13 胜 3 负，符号检验 p = 0.021。权重最高的那一行是 correctness，它涨了 **+1.50** —— 这套纪律**没有**用更好的格式换来更差的实质。代价是 turn ×2.0、花费 ×1.6。方法、限制、以及这次测量在**这个 skill 自己身上**发现的缺陷，都在 [evals/README.md](evals/README.md)。

## 十条规则

完整文本在 [`skills/receipts/SKILL.md`](skills/receipts/SKILL.md)。

1. 一个关于状态的断言，要点出产生它的那条命令。
2. 如果你没跑，就在下断言的**同一句话里**说出来。
3. 引用输出，不要概述它。
4. 把"检查通过了"和"这东西能用"分开说。
5. 说出你**没有**验证什么，以及为什么。
6. 不存在也是一个断言，它需要和存在一样的证据。
7. 永远不要把计划当成结果来汇报。
8. 排队中的 merge 不是落地。覆盖率不是证据。
9. 回答"它能用吗？"时，证据在前，结论在后。
10. "我不知道"是一个完整的回答 —— 后面跟上那条能定论的命令。

## 包里其余的部分

`/ledger:receipts` 是前门。它后面是十六个 skill，针对的是只在长周期里才现形的那些失败：散文不再描述代码、规则无人执行、死掉的代码面没人能证明它已经死了。输入 `/ledger:using-ledger` 看地图，或者直接点用某一个。

| Skill | 什么时候用它 |
|---|---|
| `receipts` | **前门** —— 每个断言都带着它的证据一起到 |
| `using-ledger` | 不确定该用哪个 |
| `adapting-to-a-project` | 在一个新仓库里做初始配置 |
| `what-counts-as-evidence` | 正要声称某件事能用、通过了、或者做完了 |
| `refusing-busywork` | 挑选要跑哪些检查，或正要重复一个已经通过的 |
| `scoping-a-change` | 弄清一次改动到底碰了什么 |
| `proving-the-regression` | 加一道守卫；声称一个修复有效 |
| `designing-concurrent-tests` | 测试碰到端口、文件、环境变量、时钟或清理 |
| `diagnosing-flakes` | 测试间歇性失败 |
| `writing-complete-propositions` | 写或改任何地方的任何散文 |
| `fact-checking-by-execution` | 记录一条命令、默认值、报错或安装路径 |
| `trimming-session-vantage` | 散文读起来像泄漏出来的推理过程 |
| `proving-code-is-dead` | 删代码，或用依赖替换手写代码 |
| `curating-decision-records` | 新增、审计或退役决策记录 |
| `reviewing-as-cis-complement` | 评审一次改动，或回应对自己改动的评审 |
| `pushing-safely` | push、force-push，或确认某个东西是否真的落地 |
| `recording-ui-evidence` | 录一段 UI 演示作为视觉证据 |

![每个 skill 在一次迭代中的位置：一个入口路由、从初始配置到记录整理的五个编号阶段，以及两个在每个阶段都适用的 skill。](assets/loop.svg)

## 七条规则

这七条压在全部十六个 skill 底下。更长的论证在 [docs/method.md](docs/method.md)。

1. **最窄的充分证据。** 跑那个真的会失败的检查。永远不要条件反射地跑全量。
2. **绝不伪造绿灯。** 不许压制空结果、不许降低阈值、不许缩小范围来藏掉一个文件。
3. **归还预算，不要发明余量。** 恢复一个本来就批过的上限不叫掩盖。放宽一个没检查过的等待才叫。
4. **简短本身不是目标。** 单是字数变少不构成改进。
5. **不设配额。** 年龄、长度、数量是发现线索的辅助手段，永远不是判据。
6. **绿色信号不是证据。** 覆盖率不等于正确性。重跑通过什么都不证明。排队中的 merge 不是落地。
7. **一个机制存在，不构成使用它的理由。** 工具会招来它能力范围内的活儿。
 
大多数贡献指南在其中几条上说的正好相反。它们让你把所有东西都跑一遍、都留着、都缩短 —— 每一条都是用条件反射代替判断。

## 适配层不是采用门槛

这里没有任何 skill 写死一条命令，因为一个把 `run-the-tests` 写死的 skill 在项目一变动的那一刻就过期了 —— 而且是静默过期，因为没有任何东西检查散文。随项目而变的值住在你仓库根目录的同一个文件 `.ledger.yml` 里，由 `adapting-to-a-project` 写出，它在记录每条命令之前会先真的跑一遍。

**大多数 skill 从不读它，也没有任何一个在等它。** 只有那些必须真的**执行**某条命令的 skill 才会因为缺值而停下，而且它会停下来告诉你它缺的是哪一个值。缺少 `.ledger.yml` 只意味着一份便利还没有去取，从来不是"这些纪律不适用于此处"的证据。

## 测过，包括它令人失望的地方

这个包带了 [15 个 eval 用例](evals/README.md)，每个都有真实的 fixture，以及一条**结果** grader —— 它问的是"这个回答里有没有用户会因为缺失而察觉的东西"，而不只是"有没有加载某个 skill"。

它们产出的最有价值的东西是**三次撤回**。有三次，一块板子显示常开路由 hook 带来了很大的收益；三次都是在读了数字背后那些运行之后，发现收益是假象 —— 缺 fixture、被限制截断的运行被算成答错、以及十次根本没到达模型的运行。**这三个错误无一例外都在给这个包加分。** 一块干净的板子测不出那个 hook 有任何可检测的收益，所以 README 不再声称有，[docs/method.md](docs/method.md) 里写了怎么把它关掉。

这就是这个包要求你达到的标准，先用在了它自己身上。

## 它不是什么

- 它**不**规定开发流程。没有"先头脑风暴、再写规格、再实现"那一套。
- 它**不**替你选架构、语言或工具链。
- 它**不**生成代码。

它管的是这个代码库及其记录必须能证明什么。这一点可以叠加在你已有的任何流程之上。

## 参与贡献

规则主要靠执行而不是靠写下来：`npm test` 会把 drift gate 跑遍整个 corpus，`npm run test:self` 会植入缺陷并证明它逐个拒绝。两者都免费，也都是 CI 在跑的。[CONTRIBUTING.md](CONTRIBUTING.md) 覆盖了少数几条检查无法表述的规则。

## 署名与许可

MIT。部分派生自 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 agent 指令语料，后者以 MIT 授权。上游声明保留在 [NOTICE](NOTICE)，本项目自身的条款在 [LICENSE](LICENSE)。

如果它帮你省掉了一句"已验证、可正常工作"而其实并没有，点个 ⭐。
