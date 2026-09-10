# Installing this pack

You are an agent that was asked to install `ledger`. Do the following, then stop and report what you ran.

## 1. Install it

```sh
claude plugin marketplace add qbs784/ledger
claude plugin install ledger@ledger
```

If `claude plugin` is unavailable, clone it instead and tell the user to pass `--plugin-dir`:

```sh
git clone https://github.com/qbs784/ledger
```

The skills are plain directory bundles under `skills/`, with `name` + `description` frontmatter and relative resource paths, so they also load if copied into `.claude/skills/`, `.agents/skills/`, or `~/.claude/skills/`. In that form the `ledger:<skill>` cross-references inside the skills resolve to nothing — they stay readable as prose. See [docs/runtime-scope.md](docs/runtime-scope.md).

## 2. Tell the user the two entry points

- `/ledger:receipts` — turns on the output discipline: every claim about state arrives with the command that produced it, and anything unverified says so. Stays on until they say `stop receipts`.
- `/ledger:using-ledger` — the map of the other twenty skills and which to reach for at each stage of a change.

## 3. Do not

- Do not create `.ledger.yml` unless the user asks. Most skills never read it, and `adapting-to-a-project` writes it properly by running each command before recording it.
- Do not claim the install worked without quoting the output of the commands you ran. That is rule 1 of the thing you just installed.
