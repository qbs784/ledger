---
name: recording-ui-evidence
description: Use when recording a browser or UI interaction demo as a GIF, when a change alters interface behavior a user can see and needs visual evidence, or when attaching a demo GIF to a change request. DO NOT invoke for a single static screenshot — none of this applies to one image.
---

# Recording UI evidence

A demo GIF is an evidence claim: *this is what the software does at this commit.* That makes the recording conditions part of the claim, and it makes splicing, fixtures, and stale builds forms of misreporting rather than shortcuts.

**One storyboard equals one isolated run.** Every published frame comes from the same server, the same state roots, and the same scenario execution. If capture automation fails partway, discard its frames and rerun from fresh roots — never assemble a demo from two runs.

## Keep recording separate from publication

- Recording produces frame images and one local `.gif`. It never mutates remote state.
- Publication is a separate, final step, performed only when the task actually includes attaching the artifact. It never touches the change's own branch.
- **Preserve the requested conditions.** A real-server or real-backend demo must not use fixture queries, mock transports, synthetic event injection, or test-only hooks. If credentials or the service are unavailable, **report that limitation** rather than substituting a fixture and calling it a demo.
- **Never read or expose credential values.** Use the application's normal configuration path and a benign demonstration input.

## Stage the application

Evidence for a specific change demonstrates that change's tree, so stage per change. Read `build` and `real_entry_point` from `.ledger.yml`.

1. **Require a clean worktree**, record its exact commit (`git rev-parse HEAD`), then build **that recorded tree**. A GIF recorded against a different commit's build misattributes the evidence, and nothing downstream can detect it.
2. **Boot one server per port from that tree**, with fresh scratch state roots — home, workspace, session. Give the browser a fresh isolated context or profile; if the tooling cannot create one, clear that origin's cookies and site storage before navigating, so persisted client state cannot affect the evidence.
3. **When switching between changes, stop the old server by PID** or by an exact match on its command line. A broad pattern kill can match and terminate the shell that launched it — including your own session.

## Record the flow

1. **Use the available browser-control tooling** and follow its own setup, interaction, and cleanup instructions. Use the user's existing browser state only when requested or required — and then say so in the provenance rather than claiming fresh client state. Do not install another driver or launch the user's browser to work around missing tooling; report the gap.
2. **Identify the setup before claiming anything about it**: the exact origin, whether the app is built or in development, the transport, and any fixture or mock mode. Record only claims the observed setup supports.
3. Where a production default opens a native operating-system surface that automation cannot drive, select an **official** alternative backend through the application's normal configuration, and state the override in the provenance. A fixture, mock transport, or test-only hook is not an acceptable substitute.
4. **Choose three to six states that tell one story** — typed, running, settled, detail. Prefer semantic state changes over continuous capture, and omit loading churn that does not help the viewer.
5. Keep one viewport and crop for every frame. Name frames lexically: `00-initial.png`, `01-typed.png`, and so on.
6. **Create the frame directory first.** Store frames under a gitignored path your browser tooling is allowed to write to, and create the subdirectory before capturing — writing into a missing directory fails at capture time, after the state you wanted is gone.
7. **Wait on a concrete condition before each screenshot**: a unique label, an enabled control, a changed document title, a completed response. Require the locator to resolve **exactly one** element. **Never use a fixed delay as proof** that the application reached a state.
8. **Make completion predicates match exact text**, not a substring. A substring check against the whole document body is also satisfied by the echo of the input you just typed — so it reports success the instant you submit, and you capture the wrong frame.
9. When the claim involves a tool call, a rejection, or a recovery, include a detail frame showing the identity, the status or stable error code, and the downstream result. A surface-level success message does not prove why the underlying path behaved that way.
10. **Capture a transient state by driving a slow foreground operation** and polling a concrete DOM marker **inside a single scripted call that also takes the screenshot.** State polled across separate tool calls is lost, because the turn settles between calls — this is the single most common reason a spinner frame comes back empty.
11. **Engineer the input so the state you need actually occurs.** Instruct the system to wait in the foreground where it would otherwise background slow work, and give it a settle sentinel to anchor the completion predicate against.
12. **Capture no secrets**, personal data, unrelated tabs, or transient notifications. Stop an unnecessarily long real-backend run once the demonstrated state is visible.

Use the browser's own screenshot API. When it returns image bytes, save those bytes directly; the encoder detects image content independently of the filename extension.

## Encode

Requires `python3`, `ffmpeg`, and `ffprobe`. **If a media binary is missing, report the dependency** instead of installing software without authorization.

Export the skill directory **on its own line** before the command. An inline assignment fails, because the argument expands before the assignment takes effect:

```sh
export GIF_SKILL_DIR=/absolute/path/to/this/skill
python3 "$GIF_SKILL_DIR/scripts/encode_gif.py" \
  /absolute/path/to/frames \
  /absolute/path/to/demo.gif \
  --durations 1.5,1.5,1.5,3.5 \
  --fps 10 \
  --max-width 1200 \
  --colors 128
```

One duration applies to every frame; otherwise give one positive duration per frame, holding the final settled state longest. The encoder rejects fewer than two frames, mismatched dimensions or duration counts, invalid limits, an accidental overwrite, an unexpected encoded duration, and output above `--max-bytes`.

For a large artifact reduce `--max-width` first, then `--colors` or `--fps`. Keep text readable and hold the final state long enough to inspect. See [scripts/encode_gif.py](scripts/encode_gif.py) for the full argument contract.

## Verify the artifact

1. Read the encoder's JSON summary: output path, source and encoded frame counts, dimensions, duration, byte size.
2. **Visually read the encoded GIF itself, not the source frames.** Confirm the transition is legible, the last state is held long enough, and no sensitive content appears. If your viewer renders only the first frame, decode representative frames out of the encoded GIF and inspect those — the pre-encode screenshots do not prove the encoded order, palette, or final hold.
3. Run `git status --short` and confirm the frames and artifact landed only under ignored paths.
4. Return the absolute path, render it if the client supports local media, and **state whether the recording used a real backend, a fixture, or another transport.** If the task does not include attaching it anywhere, stop here.

## Publish

Only when the task includes attaching the artifact.

**Never commit media to the change's own branch**, or to any branch that merges into a long-lived one: binary media committed there bloats history for every future clone, permanently.

Prefer an upload-and-rewrite attachment flow, which puts the media on the platform rather than in a branch. Reference the artifact in the body as an ordinary local path and let the tool rewrite it in place:

```markdown
![<alt text>](<path/to/demo.gif>)
```

**Immediately before attaching, re-read the live head** — for a new change request, the pushed branch tip — and compare it with the commit recorded next to the GIF. **Stop and re-record if it moved.** After attaching, re-read the live head and require it to still be that commit, re-read the live body and confirm the reference now points at the uploaded URL, render the body through the platform's Markdown API and confirm the expected `<img>`, then fetch the uploaded URL once and confirm a `200` with an image content type.

Where an attachment flow cannot apply — the artifact exceeds the size limit, the tooling is too old, or the host is not supported — fall back to a dedicated **orphan assets branch**: a branch with no parent commit and nothing but media, one per change series.

- Before pushing, verify the branch contains media only and that the staged artifact's checksum matches the verified local one.
- Work in a **shallow single-branch scratch clone**, so publication cannot touch your working tree.
- After pushing, confirm the remote path, byte size, checksum, response code, and content type using **authenticated** requests. An anonymous `404` does not disprove a private-repository asset.
- Embed with the raw-blob URL form your host requires; a plain blob URL renders a file page instead of the image.
- **Never delete, rewrite, or force-push an assets branch.** Merged change-request bodies reference its URLs forever. Append only.
