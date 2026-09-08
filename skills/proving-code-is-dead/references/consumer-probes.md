# Consumer probes

Search patterns for [the consumer classification](../SKILL.md#prove-or-reject-each-candidate) — the step where a wrong answer becomes a confident wrong deletion. A hit is not a consumer until you have read it, and a zero is not an answer until the pattern has been calibrated.

Every command below was run before it was written down; where a rule cites what a probe misses, that miss was reproduced.

## Invocation rules

These decide whether the result means anything. Getting them wrong does not produce a visibly wrong answer — it produces an empty screen, which reads as proof.

- **Calibrate in both directions before trusting a result.** Run the pattern once with the exclusions off and confirm it finds the definition site; that is the known positive. Then confirm it rejects a near-miss you can name. **A zero-hit pattern proves nothing until it has matched a known positive** — a typo in a pattern and a dead symbol look identical.

- **Read the exit code, not the empty screen.** Ripgrep exits `0` when it matched, `1` when it did not, and `2` on an error. An invalid glob, a missing path, and an unclosed group in the pattern all exit `2` after printing nothing to standard output. Append `; echo "exit=$?"` to every probe. Add `--stats` when the scope is unfamiliar: `0 files contained matches` after `3 files searched` is a real zero, and the same line after `0 files searched` means your scope or your globs ate the corpus.

- **A whole-word probe bounds the decision; a shaped probe only sorts the hits.** Anchor the superset with `-w` and rest the deletion on that. The shaped patterns below tell you *which kind* of consumer each hit is. If the superset is non-empty and every shaped pattern is empty, there is a consumer you have not identified yet — go read it rather than trusting the shaped result.

- **Anchor a symbol, but not a key stem.** `-w flush` correctly drops `flushBuffer`, a different identifier. It also drops `retry_limit`, `retryLimit`, and `RETRY_LIMIT` when you search `retry`, because `_` is a word character and camelCase has no boundary in it. Whole-word for an identifier; separator-agnostic (`retry[._-]?limit`, with `-i`) for a key that gets respelled as it crosses a serialization layer.

- **Search a method three ways.** `.name(` finds a call through a receiver; a bare `name(` finds a call through an imported or destructured binding; neither finds `const { name } = service`, `obj["name"]()`, or `{ name: … }` in a mock or a dispatch table. A deletion that checked only the receiver form has not looked at the binding sites at all.

- **Fix dotted and bracketed literals.** An unescaped `tool.finished` also matches `toolXfinished`, so a regex probe for a dotted event name can manufacture a consumer that is not there. Pass `-F` for any literal you did not deliberately write as a pattern.

- **Search hidden directories.** Continuous-integration definitions, editor and tool configuration, plugin descriptors, and agent instruction files live in dot-directories that most search tools skip by default: `--hidden --glob '!.git/**'`.

- **Know what the ignore file removed.** Ripgrep honors `.gitignore`, which excludes build output for free and *also* silently removes any tree the project ignores. That filter is invisible in the output. When a corpus has to be complete, pass `--no-ignore` and supply the exclusions yourself.

- **Exclude generated files, build output, vendored trees, and lockfiles — last, so a later include cannot re-admit them.** A generated file is a derivative: a hit in it restates a hit you already have at its source, and deleting it is the source's job. Build output is a copy. A lockfile names a package once per dependent and turns a package probe into a large number containing no consumers. Exclude lockfiles by their real filenames; a `*lock*` glob also hides `src/lock.ts`, which may be the one genuine caller.

- **Split by corpus at search time.** Run the same pattern twice — once scoped to the `source.production` globs, once to `source.non_production` — so the classification is a property of the command rather than of your reading afterwards. Anything matching neither glob is the ambiguous corpus, and it gets read by hand.

## The battery

Append the scope you were given to each line, then the exclusion globs above, last.

### An identifier you can name exactly

```sh
rg -n --hidden -w 'SymbolName' -- <scope>; echo "exit=$?"
```

### A method

```sh
rg -n --hidden -w 'methodName' -- <scope>                          # the superset the decision rests on
rg -n --hidden '\.methodName\s*\(' -- <scope>                      # called through a receiver
rg -n --hidden '(^|[^.\w])methodName\s*\(' -- <scope>              # called through a bare binding
rg -n --hidden "methodName\s*[:,}]|['\"]methodName['\"]" -- <scope> # destructured, keyed, or stringified
```

The fourth line is the one people omit, and it is where mocks, proxies, dispatch tables, and destructuring imports live.

### An event, notification, or wire literal

Two spellings, and they drift apart: the constant in code and the literal on the wire.

```sh
rg -n --hidden -w 'EVENT_CONSTANT' -- <scope>
rg -n --hidden -F 'domain.event.finished' -- <scope>
rg -n --hidden -i 'domain[._-]?event[._-]?finished' -- <scope>
```

Search both sides of the edge. A producer and its decoder are usually in different directories and are often in different languages, so a scope drawn around the producer answers half the question.

### A configuration key

```sh
rg -n --hidden -i 'retry[._-]?limit' -- <scope>
rg -n --hidden -w 'RETRY_LIMIT' -- <scope>
```

Then read the shipped defaults and example configurations by hand. **A key present in a configuration file the project ships is a consumer**, even when no code path reads that instance today — removing the key makes the shipped file invalid.

### A package or a module

```sh
rg -n --hidden -F 'the-package-name' --glob '!**/node_modules/**' -- <scope>
rg -n --hidden -F 'utils/retry' -- <scope>              # module path, including the extension-less specifier
rg -n --hidden 'export .*\bfrom\b.*retry' -- <scope>    # re-exports, which widen the surface
```

Read every manifest's dependency list as well. A dependency edge with no import is still a consumer when the package contributes a binary, a plugin entry, or a build step.

## What a text search structurally cannot find

Every probe above answers one question: does this string appear? A consumer that never spells the name loses that question without ever being wrong. **This is the failure mode that makes a deletion both confident and wrong**, so treat the list below as part of the search rather than as a caveat on it.

- **Reflective and computed access** — `obj[key]`, `getattr`, a name assembled from fragments (`` `on${Name}` ``, a prefix concatenated with a suffix). Search the fragments, and search the mechanism: find the accessor call sites and read what feeds them. When the name is assembled from a value that varies at run time, no search terminates.

- **String-keyed dispatch** — registries, command tables, event buses, injection containers, flag maps. The symbol appears exactly once, at registration; every consumer names a string instead. Find the registration call, then search for the key, not for the symbol.

- **Declarative wiring** — plugin manifests, service descriptors, packaging and container metadata, continuous-integration definitions, injection configuration. These are consumers written in a different file type, usually in a hidden directory, often under a different naming convention than the code. This is why `--hidden` and the separator-agnostic key probe are not optional.

- **Serialized and durable data** — a persisted record holding an enum value, configuration written by an older version, a committed fixture, a log a reader must still parse. **A durable record is a consumer you cannot edit**, so this family does not resolve into a deletion at all. It resolves into a compatibility decision, and that decision belongs in the proposal.

- **Cross-repository consumers** — anything reachable from a published entry point, a downstream service that speaks your format, a plugin ecosystem, a documented public API. Check whether the symbol is re-exported from an entry named in the package manifest. If it is, your search corpus is not the consumer corpus, and no local zero can prove absence of one.

- **Readers that are not code** — a runbook, an operator's saved query, a support script kept outside the repository. Cheap to miss, expensive to break, and invisible to every command on this page.

**When the search cannot terminate, stop searching and make the referent fail loudly.** Rename it, or keep the name and throw from the body, then run the build, the whole suite, and the real entry point named in `.ledger.yml` (`commands.build`, `commands.full_test`, `commands.real_entry_point`). A dynamic consumer surfaces as a run-time failure no pattern would have produced. This is one of the few places where the whole suite is the narrowest sufficient check rather than a reflex — the question genuinely is "does anything, anywhere, reach this".

It is still weaker than it looks: it proves only what those runs exercised. Record what you ran, and read `protected_seams` as the list of designs this technique is known not to reach. On what a run does and does not establish, see ledger:what-counts-as-evidence; on treating an executed result as the only admissible evidence, ledger:fact-checking-by-execution.

## Known over-match families

Hits that are not consumers. Judge each family once and record the verdict, so the next survey does not re-derive it.

- **The referent's own surface** — its declaration, overloads, interface members, and doc comment. A barrel re-export is not usage either; it is a wider surface, and it counts against the deletion under cross-repository consumers rather than for it.
- **A different symbol with the same name** — `run`, `send`, `close`, `flush`, `parse` collide across unrelated modules. Read the import, not the line.
- **Tests that only assert the symbol exists** — an exported-surface snapshot or an export-list assertion consumes the surface, not the behavior. These update along with the deletion; they never justify keeping it.
- **Documentation, decision records, and release notes** — non-production by definition. They enumerate what to update, not what to preserve.
- **Commented-out code and unreachable branches** — a hit in text the compiler already discards.

## Recording the result

"I searched and found nothing" is not reviewable, and it is indistinguishable from not having searched. For each referent, record:

- the exact pattern, with its exclusion globs;
- which corpus each run covered, and the hit count per corpus;
- the calibration positive — the known hit the pattern produced with exclusions off;
- which structural families above the search could not cover, and what you did instead.

A reviewer can re-run that. A reviewer cannot re-run a summary.
