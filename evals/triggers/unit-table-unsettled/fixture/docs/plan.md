# Export rework — units

Approach approved 2026-09-08. Five units, listed in the order I expect to do them.

- **U1 — Extract the row formatter.** Move `formatRow` out of `export.mjs` into
  its own module, unchanged. Deliverable: `src/format-row.mjs`.
- **U2 — Add the CSV dialect option.** `formatRow` grows a `dialect` argument;
  quoting and separator follow it.
- **U3 — Streaming writer.** Replace the buffered write in `export.mjs` with a
  stream. Does not touch formatting.
- **U4 — Locale-aware number output.** `formatRow` renders numbers through the
  requested locale instead of the default.
- **U5 — Wire the new options through the CLI.** Flags for dialect and locale.

U2, U3 and U4 have no ordering constraints between them and can be done in
parallel once U1 lands.
