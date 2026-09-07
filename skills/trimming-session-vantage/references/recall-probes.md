# Recall probes

Search patterns for [the taxonomy](../SKILL.md#taxonomy). Every hit needs semantic judgment: these over-match by design, and they under-match by nature — pair them with an unpatterned read of the densest prose in scope.

## Invocation rules

These six rules matter more than the patterns. A miscalibrated probe produces a corpus result that looks authoritative and is not.

- **Search hidden directories.** Most search tools skip dot-directories by default, and instruction files, decision records, and agent configuration usually live in one. In ripgrep: `--hidden --glob '!.git/**'`.
- **Put exclusions last**, so a later include cannot re-admit them: `--glob '!vendor/**' --glob '!node_modules/**'`, plus any frozen archive, recorded fixture, and snapshot directory in scope, plus **this skill's own directory** — the examples file quotes leaked wording as calibration and will self-hit forever.
- **Exclude test and eval fixtures that quote the defect on purpose.** Any corpus that feeds prompts or expected outputs to a checker will contain planted leaked wording, and it is supposed to. Add those paths the first time they surface rather than re-judging them every round.
- **Case-sensitivity is per-line, not global.** Natural-language patterns take `-i` so sentence-initial capitals hit ("This PR adds…", "Probably fine…"). The code-shaped pattern stays case-sensitive: `-i` would turn `\bT\d\b` and `\bP-I\b` into noise.
- **Bound complete phrases.** `\bthis PR\b` must match "this PR adds" without matching "this project", "this process", or "this provider".
- **Calibrate in both directions before trusting a result.** **A zero-hit pattern proves nothing until it matches a known positive, and a noisy pattern proves nothing until it rejects a near-miss negative.** This is the rule people skip, and skipping it is how a clean sweep report gets written over an uncleaned corpus.
- **Aim working-language probes at the opposite-language surface.** Search for the team's working language inside prose published in another language, and for change narration inside translated counterparts. Do not search generically for published-language text inside working-language prose — code, identifiers, and product names make it uselessly noisy. Compare the counterpart against its source instead.

## English battery

```sh
rg -n --hidden '\(decision \d|\(audit [A-Z]\d|design §|plan §|design ledger|\(B ruling|\bP-I\b|\bW\d\b|\bT\d\b'
rg -n --hidden -i '\bthis PR\b|\bthis branch\b|\bthis stack\b|\blater PRs?\b|\bprevious commits?\b|\bthis commit\b'
rg -n --hidden -i '\bused to\b|\bno longer\b|\bpreviously\b|\bthe old\b|\bwas renamed\b|\bwas moved\b'
rg -n --hidden -i '\bv1\b|this cut|\bcut \d|\btoday\b|\bfor now\b|roadmap'
rg -n --hidden -i 'rejected in review|review round|reviewer|as of v\d'
rg -n --hidden -i 'probably |should be enough|should suffice|it simply|is safe —|is safe --'
rg -n --hidden '§\d'
```

Append the scope you were given to each line. Add the exclusion globs from the invocation rules, last.

## Working-language battery

Language-specific patterns are not shipped here, because the pair of languages is a property of your project rather than of this skill. Build them from the rule above:

1. Take the 8–12 highest-frequency working-language words that signal **change or review narration** — the local equivalents of "review", "previous round", "old version", "no longer", "formerly", "legacy" — and search for them inside translated counterparts.
2. Take those same words plus structural residue that leaks from design and planning artifacts — separator markers, internal section labels, design-tool vocabulary — and search for them inside prose published in another language.
3. Run the second set separately against comment and docstring syntax for each language in the repository, since a comment-only match needs the comment prefix in the pattern or it drowns in string literals.

Calibrate each pattern against a known positive and a near-miss negative before trusting it, exactly as for the English battery.

## Known false-positive families

Judged and kept in the sweep this skill came from. Expect all of them again.

- **Instrumental "used to"** — "the key used to sign requests" is instrumental, not temporal. The temporal form has a subject state before it ("colors used to come from…").
- **Runtime old/new** — "the old connection drains before the new one accepts" names two live objects during handover, not repository states.
- **"This PR" in process documentation** — documentation *about* the change-request workflow ("the PR body should…", templates, contributor guides) legitimately says "PR". The ban is on a document adopting one change's viewpoint about the code.
- **`v1` as a protocol or path segment** — `/v1/chat` endpoints and wire-format names are identifiers, not version stamps.
- **`§N` with a committed owner** — external standards (RFC 9110 §10.1.5) and committed documents that own their section numbering stay citable by section.
- **Contrastive "actually" and the noun "wait"** — ordinary English, not hedging. No pattern above probes them; they surface only if you extend the battery with broader hedging patterns.
- **Runtime "today" and recorded timestamps** — a prompt or test asking for the current date uses natural time, not a repository version stamp, and recorded command output keeps its own voice. Wording that reaches a model or a user still needs behavior evidence before any edit.
- **Alternatives-considered sections** — "rejected" inside a decision record's genre slot is the sanctioned home, not review choreography.
