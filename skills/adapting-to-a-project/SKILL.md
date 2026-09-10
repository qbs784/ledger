---
name: adapting-to-a-project
description: Use when setting up this pack in a repository for the first time, when another skill in this pack reports a missing or unverified adapter value, or after a project's test commands, CI lanes, git hooks, or source layout change. DO NOT invoke to select or run checks for a specific change — route that to ledger:refusing-busywork.
---

# Adapting to a project

No skill in this pack names a command. Disciplines are general; the commands that implement them are not, and a skill that hardcodes one goes stale the moment the project moves — silently, because nothing checks prose. So every project-varying value lives in one file at the repository root, `.ledger.yml`, and every other skill reads it.

This skill owns the adapter file and nothing else: it records what a project's commands are, never which of them a given change needs.

Your job is to write that file for this repository, and to have run everything you put in it.

## The one rule

**A value you did not run is not a value.** The only admissible evidence that a command is this project's coverage lane is having executed it and seen it behave like one. A wrong entry is worse than a missing entry: a missing entry makes a skill stop and ask, while a wrong entry makes it run something and believe the result.

Record only what you observed. Where you cannot execute something — a CI-only lane, a command needing credentials you must not use — leave the value `null` and add it to `unverified` with the reason. Never copy a command from a README, a CI file, or a sibling project without running it.

## Procedure

1. **Read before asking.** Take the project's package or build manifest, its CI workflow definitions, its git hook configuration, and its contributor documentation. Most values are discoverable; an interview that asks what the repository already states wastes the user's turn.

2. **Derive candidates, then execute each one.** For every command you intend to record, run it and observe: does it do what the key claims, and does it exit non-zero on failure? A test lane that passes with no tests collected is not a test lane — note that separately, because a flag that suppresses empty results is a way to fake a green.

3. **Separate what CI owns.** Read the workflow definitions and record which lanes run there exhaustively. This is what lets later skills refuse to duplicate CI locally, so getting it wrong costs every future iteration.

4. **Record what already runs automatically.** List the project's pre-commit and pre-push hooks. A skill must never re-run as ceremony something a hook already did.

5. **Classify the source tree.** Write globs for production and non-production paths. Get this from the build configuration and the published entry points, not from directory names. This is the input to proving code is dead, and a mistake here produces confident wrong deletions.

6. **Write the file before you ask anything.** Every value you executed goes in;
   everything else goes in as `null` with its reason under `unverified`. That is
   the shape the template documents — an absent key cannot be told apart from a
   key nobody considered — so a file full of nulls is a correct intermediate
   state and an unwritten file is not. Waiting until the last question is
   answered means a session that gets interrupted, or a reader who does not
   answer, ends with nothing at all.

7. **Then ask only for what the repository cannot tell you**, against the file
   that now exists. Two things usually need a human: which designs are
   intentional but look removable (`protected_seams`), and whether the project
   keeps durable decision records. Ask them directly and briefly; do not
   interview around them. Their answers are an edit to a written file, not a
   precondition for writing one.

8. **Make it discoverable.** A file nothing points at is a file nobody loads. Offer to add one line to the project's always-loaded instruction file (`CLAUDE.md`, or whatever this harness loads by default) naming `.ledger.yml` and saying that the pack's skills read it. Ask before editing that file.

## The schema

Copy [references/adapter-template.yml](references/adapter-template.yml) and fill it in. Every key carries a comment saying what reads it and what breaks when it is wrong. Keep unfilled keys present and `null` rather than deleting them — a key that is absent is indistinguishable from a key nobody has considered.

[references/adapter-example.yml](references/adapter-example.yml) is the same file once a real project has been read: it shows a verified value sitting next to a deliberate `null`, and an unverifiable one carrying its reason instead of a guess. Copy the shape, not the values.

## Report

State, in this order: the values you executed and confirmed; the values left `null` and why; and the questions the user answered. Then name the skills that are now usable and the ones still blocked on a missing value.

Do not report the adapter as complete because the file exists. It is complete when every non-`null` command has been run once and behaved as its key claims.
