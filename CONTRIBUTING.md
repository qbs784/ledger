# Contributing

The pack's rules are mostly enforced by `node tests/drift-gate.mjs`, so the fastest way to learn them is to run it. This page covers the few that a check cannot state, and what a useful change looks like here.

```sh
npm test          # the drift gate over the whole corpus, plus the change-scope behavior test
npm run test:self # plants defects and proves the gate rejects each one
```

Both are what CI runs. Neither costs anything.

## The rules the gate enforces

Read the failure message; each one says what it wants. In summary, a change is rejected if it:

- puts a **project-specific referent** into skill prose — a package manager, a test runner, a lane name, a repository layout, a default branch. Disciplines are general; the commands that implement them belong in `.ledger.yml`. This is the rule the whole pack exists to hold, and it is the one that killed the two upstream skills this pack was extracted from.
- **names another skill pack, plugin, or product** in any shipped file. Positioning here is by claim, never by contrast. If a sentence only makes sense as a comparison, cut it and state the underlying claim.
- leaves the **router** naming a skill that does not ship, or omitting one that does. A router that lies is worse than no router.
- ships a file inside a skill directory that the `SKILL.md` **never names by relative path**. The model is handed a base directory, not a listing, so an unnamed file is unreachable — it is not documentation, it is dead weight.
- writes a **description over 500 characters**, or containing `<` or `>`.
- cites an **adapter key** that the template does not declare, at the path it declares.
- lets the README's skills table, the eval corpus table, the three manifests' versions, or the advertised planted-defect count **drift** from the thing they describe.

## Writing a description

The description is the entire trigger surface — there is no always-loaded instruction file behind a plugin skill. Two rules, both learned the hard way:

**Triggers and negative routes only. Never summarize the workflow.** A description that describes the process gives the model a shortcut it will take instead of reading the body, and the body then becomes documentation nobody reads.

**Always include a negative route** naming the sibling this skill is most likely to be confused with: `DO NOT invoke to X — route that to ledger:<sibling>`. Every one of the 16 has one, and for a pack with adjacent boundaries it is the strongest anti-mis-trigger device available.

## Evidence expected on a change

Proportionate to what changed, and following the pack's own rules:

- Prose or a new skill: `npm test`, plus the trigger evals if you changed a description (see `evals/README.md` — those cost money, so say what you ran and what it printed).
- The gate itself: **a planted defect proving the new check can fail.** `npm run test:self` must go up by one. A check nobody has watched fail is not a check.
- A shipped script: exercise the behavior, not just the syntax. `tests/change-scope.test.mjs` is the shape to copy.
- Any claim about a command, a default, or an error message: run it and quote what you observed. Do not carry a value from memory or from another project's docs.

## Reporting something

Open an issue with what you ran, what you observed, and what you expected — in that order. For a skill that failed to trigger, the prompt you used is the finding; include it verbatim.

An honest gap is more useful than a guess. If you could not verify something, say which part and what would verify it.

## Cutting a release

The version lives in three files: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (`plugins[0].version`), and `package.json`. The drift gate fails when they disagree, but it cannot tell you which one is right — so change all three in one commit, in that order, and let the gate confirm.

```sh
# 1. bump all three, then prove they agree and nothing else drifted
npm test

# 2. commit the bump on its own, so the tag points at exactly the released tree
git commit -am "release: 0.2.0"

# 3. tag — this validates plugin.json against the marketplace entry before writing
claude plugin tag . --dry-run
claude plugin tag .

git push --follow-tags
```

`claude plugin tag` refuses to run with uncommitted changes, which is why the bump gets its own commit.

**The tag is an archival marker, not the distribution mechanism.** Neither `claude plugin marketplace add` nor `claude plugin install` takes a ref or tag flag; the version inside `plugin.json` is what decides whether an installed copy is out of date. A tag that disagrees with `plugin.json` misleads a reader and changes nothing about what anyone installs.

Release notes go in the GitHub release, not in a changelog file. A changelog here would record what `git log` already records, and an unmaintained one is the exact rot this pack exists to name.

## Branding assets

`assets/` holds two SVGs used in the READMEs, plus the social-preview source and its rendered PNG. Every vector is hand-written — no design tool, no binary source to lose.

- `logo.svg` and `loop.svg` are theme-aware: the palette is redefined under `prefers-color-scheme: dark`, and the base colours are mid-tones that clear a 3:1 contrast ratio against **both** a white and a dark background, so the artwork still reads if a renderer strips the media query rather than collapsing into the page. Every shape in `loop.svg` is stroke-only for the same reason — a filled card that stays light on a dark page is the failure this avoids.
- `loop.svg` names all twenty-two stage skills — every shipped skill but `receipts`, which is an output style holding for a whole iteration rather than a step inside one — and the drift gate fails if it names one that is not shipped or omits one that is.
- `social-preview.png` is what a platform shows when the repository link is shared. It is a raster on someone else's surface, so its colours are baked rather than theme-aware. Regenerate it from its source after any edit:

```sh
rsvg-convert -w 1280 -h 640 assets/social-preview.svg -o assets/social-preview.png
```

Uploading it is a repository setting rather than a file in the tree: **Settings → General → Social preview**. The API does not expose it, so a fresh clone of this repository does not carry it.

## License

By contributing you agree your work is licensed under the [MIT License](LICENSE). The upstream derivation notice in [NOTICE](NOTICE) is an obligation to a third party — leave it alone.
