---
name: fact-checking-by-execution
description: Use when writing or revising any document, README, comment, or guide that claims a command, a configuration snippet, a default value, an error message, a platform difference, or an install path. Also use when auditing existing documentation for stale claims. DO NOT invoke for prose style or length decisions — route those to ledger:writing-complete-propositions.
---

# Fact-checking by execution

**The only admissible evidence for an operation claim is having run it.**

This skill owns whether a claim is true. It does not own how the claim is worded, how long the page runs, or where it lives.

Documentation states how something behaves now. Every other source — your memory, a neighbouring module's README, the shape of the config file, what the function name implies — is a guess with good posture. Guesses are exactly as likely to be right as the last time the code moved, and nothing tells you when that was.

This procedure is mandatory for every new document, and for every new paragraph that claims an operation, command, default, error, or platform difference.

## Procedure

1. **Run every claimed operation against the current checkout.** Execute each command, configuration snippet, and example **exactly as the document will show it** — not a variant you know works. Write down only what you observed, including exact output, warnings, and failure modes.

2. **Record observations, not expectations.** If the output surprised you, the surprise is the finding. Quote it.

3. **Delete what you could not reproduce.** Never carry a command, field, default value, or behavior forward from memory, from analogy, or from a neighbouring project's documentation. **When a claim fails to reproduce, fix the claim — not the test.** The failure just told you something true.

4. **Check existing pages against the current default branch.** Before revising a pre-existing page, fetch and compare the section against the remote default branch. A stale statement that has survived on the main line is still wrong: correct it against the code, not against the existing prose.

5. **Regenerate every derivative.** If the document has generated counterparts — a translated pair, a published site, an extracted catalog — update them from the corrected source rather than editing them in place.

Read `commands.docs_check` from `.ledger.yml` and run it on what you touched.

## Check each claim against its strongest owner

Prose is only as good as what it was checked against, and the owners form a strict hierarchy:

| For | The owner is |
|---|---|
| names, entry points, install paths | the package or build manifest |
| API contracts | public types and API docs |
| behavior | runtime code |
| exercised failure paths | tests |
| exhaustive inventories | generated catalogs |
| rationale | active decision records |

**Never treat a prior README, a discussion, or a report as stronger evidence than current code and tests.** That inversion is how a wrong statement survives three rewrites — each author checked it against the previous author, and the chain never touched the code.

Classify the subject before writing install or usage guidance, and classify it from facts rather than from a folder name. A document that gives install instructions for the wrong kind of artifact is confidently wrong in the one place a newcomer starts.

## When you genuinely cannot run it

Some claims depend on a credential you must not use, a platform you do not have, or a service you cannot reach. That is a normal situation, and it has one correct handling:

**Name the verification owner instead of asserting the behavior.** Say which claim is unverified, what would verify it, and who or what can run that. Then leave the claim marked, or leave it out.

What you must not do is soften it into something that reads verified — "should return", "is expected to" — because a hedge is indistinguishable from a checked fact once the page is a month old. An explicit gap survives; a hedge decays into a claim.

## Report

State which operations you executed and what you observed, which claims you deleted for failing to reproduce, and which remain unverified with their verification owner.

A documentation change reported as "updated the docs" is unreviewable. The reviewable form is: here is what I ran, here is what it printed, here is what I therefore wrote.
