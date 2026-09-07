# Controlled technical English, and how to judge a page

Two things live here: the sentence-level review pass, and the criteria for judging whether a finished page is any good.

## The review pass

Use an [ASD-STE100](https://www.asd-ste100.org/)-inspired pass for prose that an agent, a translator, or a non-native reader must parse. **This is a clarity discipline, not certified compliance** — no controlled dictionary is reproduced or validated here.

- Name the actor and the action. Prefer active voice when the actor matters.
- Use one stable term per concept. **Do not rotate synonyms for variety.**
- Prefer direct verbs. Replace nominalizations and ambiguous phrasal verbs where a precise verb exists.
- Put one instruction in each sentence. Use a list for three or more steps or conditions.
- Split semicolons and long clause chains. Keep each paragraph on one topic.
- Remove unsupported quality adjectives and stacked hedges. Preserve every fact and every degree of uncertainty from the source.

Treat **20 words for an instruction** and **25 words for a description** as review prompts, not mechanical gates. Keep a longer sentence when splitting it would hide a condition or a relationship.

**Never remove or strengthen "must", "may", "never", a timing constraint, an exception, a number, or any other contract term in order to meet a length target.** This is the rule that a length-driven edit breaks first, and the damage does not look like damage: the sentence reads better and means something else.

## Emphasis discipline

Reserve bold for the clause that changes behavior, or for the comparison that matters. Bold applied to every third phrase carries no information — it just costs the reader the ability to skim.

In a comparison table, bold the column headers and the best value in each row.

## Quality criteria

Use these in review. Each section should open with a short orienting paragraph before subsections or exhaustive detail.

- **Brief:** the common path contains only the facts needed for its outcome; exhaustive truth stays one direct link or one detail layer away.
- **Intuitive:** prerequisites precede dependent concepts, one next action is obvious, and headings use the terms readers actually search for.
- **Friendly:** a reader can recognize success, understand the risk before acting, recover from a likely failure, and choose whether to go deeper.
- **Accurate:** each durable claim has one owner and a verification path proportionate to its risk.
- **Agent-readable:** stable headings, anchors, terminology, and status support targeted retrieval without loading the whole corpus.
- **Newcomer-complete:** a professional engineer with no context can reconstruct the relevant architecture or feature through three to five linked pages.

**Do not apply a universal word limit to an exhaustive reference.** Measure entry-path length, how much unrelated material is scanned for one lookup, the largest section, the heading count, and the page size. Split by an existing domain owner when retrieval cost is high — not when the total merely looks large.

## The newcomer test

A professional engineer with no prior context should be able to answer all of the following after three to five linked pages: what the thing does; how to run or use it safely; where its state lives; which component owns it; how it fails; and where to change it.

If the reader must read source merely to discover the public flow, restore the missing explanation. If the reader must absorb unrelated internals to reach one answer, move those details deeper.

## Check each claim against its strongest owner

Prose is only as good as what it was checked against, and the owners form a strict hierarchy — code and tests outrank any prior document, including this project's own.

`ledger:fact-checking-by-execution` owns that hierarchy and the rule behind it: for an operational claim, the evidence is running it, not reading it.
