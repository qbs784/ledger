# Runtime scope

What in this pack is specific to one agent runtime, what is portable, and what would have to be true to add a second. Written because "does this work with X?" is the most predictable question a public skill pack gets, and the honest answer is more useful than a shrug in either direction.

## What is portable

The skills themselves. Each is a directory bundle — `skills/<name>/SKILL.md` — with frontmatter carrying only `name` and `description`, and every bundled resource named by an explicit relative path in the body. That is the intersection honored by every runtime examined so far, and it was chosen deliberately rather than discovered:

- **Directory bundles, never flat files.** In at least one runtime, a flat `<name>.md` gets the whole scan root as its resource base, so `references/foo.md` silently fails to resolve. The directory form is the only one where bundled resources work.
- **Resources are a base path, not a listing.** A runtime hands the model a base directory and nothing else. A file the `SKILL.md` never names is unreachable, which is why the drift gate fails on an unreferenced resource.
- **Discovery is one level deep.** A nested `SKILL.md` below the top level is not found, and every direct `*.md` at a scan root is parsed as a skill candidate — which is why the README lives at the repository root and not under `skills/`.
- **Frontmatter beyond name and description is not portable.** `allowed-tools` is honored by some runtimes and silently ignored by others. It is safe to carry and unsafe to depend on.

Copy `skills/<name>/` into a project's `.claude/skills/` or `.agents/skills/`, or into `~/.claude/skills/`, and the files load.

## What is Claude Code-specific

Four things, and they are the reason "load unchanged" is a claim about files rather than about behavior.

1. **The `ledger:<skill>` routing form.** Twenty-seven cross-references inside the skills use it. That namespace exists because the plugin was installed under the name `ledger`; copied loose into a skills directory, the skills load but those references name nothing. They stay readable as prose — a reader can see which sibling is meant — but no tool resolves them.
2. **The two manifests.** `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are the plugin and marketplace formats of one runtime. Another would need its own.
3. **The `SessionStart` hook** under `hooks/`. The hook event, the `hookSpecificOutput.additionalContext` response shape, and `${CLAUDE_PLUGIN_ROOT}` are all one runtime's contract.
4. **`evals/`.** The case schema, the grader types, and the with/without ablation belong to one runner.

## What a second runtime would cost

Roughly in order of effort:

- **Manifest translation** — hours. A parallel manifest directory declaring the same skills. One known trap from the field: at least one runtime accepts `skills` only as a single path string rather than an array, so a manifest that works in one place is rejected outright in another.
- **The routing prefix** — half a day, and it is the one that must not be done casually. Stripping `ledger:` from 27 references would make them runtime-neutral, but the drift gate's cross-reference check matches exactly that form; those 27 references are pinned *because* they carry the prefix. Removing it without widening the check would silently retire the guarantee that the pack never routes to a skill it does not ship. Change both together or neither.
- **Per-runtime adaptation notes** — hours per runtime. Where a runtime's tool names or capabilities differ enough to change a skill's instructions, that belongs in a reference file the skill loads conditionally, not in branching prose inside `SKILL.md`.
- **Hook and eval equivalents** — only if that runtime has the concepts at all.

## One trap worth inheriting

**Do not ship symlinks inside the tree.** At least one runtime copies a plugin tree into a cache and drops symlinks in the process, so a curated directory of links arrives empty — installed, discovered, and containing nothing. Symlinks are fine for linking a working copy into a local skills directory; they are unsafe for packaging. The drift gate fails on a symlink under `skills/` for this reason.

## Current position

Claude Code is the only supported target. The portability work has already been paid for in how the skills are authored, so adding a runtime is manifest-and-routing work rather than a rewrite. Nothing here has been executed against a second runtime, and no claim in this document should be read as though it had — the portable/specific split above is derived from those runtimes' own loader sources and documented contracts, not from a successful install.
