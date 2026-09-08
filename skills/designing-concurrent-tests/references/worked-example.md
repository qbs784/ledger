# Worked example: one fixture, five defects

The code is JavaScript on Node APIs because a fixture has to be written in some language; **what generalizes is the shapes** — atomic allocation, presence-aware restoration, an owned readiness signal, an awaited completion signal — not the imports. The subject is a small relay: `createRelay({ dropDir })` returns an event emitter carrying a `handler` for `createServer`; it writes each accepted payload into `dropDir` and emits `dropped` once that write lands. It reads a token from the environment through a dependency the test does not own, so the environment mutation here is required rather than lazy.

## The broken fixture

```js
// BROKEN. The numbered lines are defects, not style preferences.
import { createServer } from 'node:http'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createRelay } from './relay.js'

const DROP_DIR = '/tmp/relay-fixture'                      // (2) predictable shared path
let server

beforeEach(async () => {
  process.env.RELAY_TOKEN = 'fixture-token'                // (3) unguarded global mutation
  await mkdir(DROP_DIR, { recursive: true })
  server = createServer(createRelay({ dropDir: DROP_DIR }).handler)
  server.listen(8080)                                      // (1) a port the test chose
  await new Promise(resolve => setTimeout(resolve, 200))   // (4) sleep standing in for readiness
})

afterEach(() => {
  delete process.env.RELAY_TOKEN                           // (3) restores the wrong state
  server.close()                                           // (5) never awaited
})

test('relays a payload to the drop directory', async () => {
  const response = await fetch('http://127.0.0.1:8080/drop', { method: 'POST', body: JSON.stringify({ id: 'a1' }) })
  expect(response.status).toBe(202)
  await new Promise(resolve => setTimeout(resolve, 100))   // (4) sleep standing in for completion
  const written = await readFile(join(DROP_DIR, 'a1.json'), 'utf8')
  expect(JSON.parse(written).id).toBe('a1')
})
```

It passes. Run alone on a quiet machine it passes every time, which is why it survives review.

## Stage 1 — allocate the port, do not name it

`listen(8080)` collides the moment a second file, worker, or job on the same host wants that port, and the collision surfaces in whichever test *lost* the race rather than in the one holding the port. Bind `listen(0, '127.0.0.1')`, wait for the `listening` event, then read `server.address()`. **Reading the address before that event yields `null`**, so the wait belongs to the allocation rather than to a separate readiness step.

## Stage 2 — a private root, not a shared one

`/tmp/relay-fixture` is a name any other process can also compute. Two runner processes write `a1.json` over each other, and the assertion can read the *other* process's file and still pass — a green result carrying no information. `mkdtemp` returns a directory nobody else will name. Pass it in rather than letting the module reach for a constant: an injected dependency is the form of this rule that needs no restoration at all.

## Stage 3 — restore the prior presence, not just the prior value

This is the defect that looks fixed and is not. Three restores, only one correct:

```js
// Wrong: deletes a key that may have been present and empty before the test.
delete process.env.RELAY_TOKEN

// Worse: when the prior value was absent, `prior` is undefined and the
// assignment stringifies it — the key now exists, holding "undefined".
process.env.RELAY_TOKEN = prior

// Correct: capture presence AND value, then restore that exact state.
const had = Object.hasOwn(process.env, 'RELAY_TOKEN')
const prior = process.env.RELAY_TOKEN
const restore = () => {
  if (had) process.env.RELAY_TOKEN = prior
  else delete process.env.RELAY_TOKEN
}
```

An environment that exported `RELAY_TOKEN=` holds a **present, empty** value. Any consumer that branches on presence — `'RELAY_TOKEN' in process.env`, a required-variable check, a configuration loader that distinguishes unset from blank — sees a different world after `delete` than before it. The test that observes the difference is never this one; it is whichever test runs next in the same process, and it fails on an assertion that has nothing to do with tokens. Register `restore` immediately after the capture and before the mutation, so a failure between them still restores. Where the mutation only has to span a single call, put it in a `try`/`finally` inside the test and keep the hook as the fallback.

## Stage 4 — synchronize on state

Both sleeps are guesses about someone else's scheduling. The 200 ms bind sleep is answered by the `listening` event from stage 1. The 100 ms write sleep is answered by the `dropped` event the relay already emits — **subscribed before the request that triggers it**, or the event fires while nothing is listening and the wait hangs until the lane's timeout. A sleep is also charged to every run forever, and the tempting repair when it eventually goes red under load — raise it to 500 ms — is on the list of [flake-masking fixes](../SKILL.md#reject-flake-masking-fixes).

## Stage 5 — dispose to quiescence

`server.close()` stops new connections and returns immediately; sockets already accepted keep the server alive. The next test starts while this one's handler can still write into a directory that is about to be removed. Call `closeAllConnections()`, then `close()`, then await the `close` event. Remove the temporary root last, with a bounded retry: on a host that releases file handles asynchronously, a removal that succeeds instantly elsewhere fails here for a few milliseconds after the server lets go.

## The corrected fixture

```js
import { createServer } from 'node:http'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRelay } from './relay.js'

let dropDir, server, relay, origin, restoreToken

beforeEach(async () => {
  dropDir = await mkdtemp(join(tmpdir(), 'relay-'))

  const had = Object.hasOwn(process.env, 'RELAY_TOKEN')
  const prior = process.env.RELAY_TOKEN
  restoreToken = () => {
    if (had) process.env.RELAY_TOKEN = prior
    else delete process.env.RELAY_TOKEN
  }
  process.env.RELAY_TOKEN = 'fixture-token'

  relay = createRelay({ dropDir })
  server = createServer(relay.handler)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  origin = `http://127.0.0.1:${server.address().port}`
})

afterEach(async () => {
  restoreToken?.()
  restoreToken = undefined
  if (server) {
    server.closeAllConnections()
    server.close()
    await once(server, 'close')
    server = undefined
  }
  if (dropDir) {
    await rm(dropDir, { recursive: true, force: true, maxRetries: 10 })
    dropDir = undefined
  }
})

test('relays a payload to the drop directory', async () => {
  const dropped = once(relay, 'dropped')          // subscribe before triggering the work
  const response = await fetch(`${origin}/drop`, { method: 'POST', body: JSON.stringify({ id: 'a1' }) })
  expect(response.status).toBe(202)
  await dropped
  const written = await readFile(join(dropDir, 'a1.json'), 'utf8')
  expect(JSON.parse(written).id).toBe('a1')
})
```

## Defect-to-rule map

| Broken line | Rule it violates |
|---|---|
| `server.listen(8080)` | [Allocate atomically](../SKILL.md#allocate-resources-atomically) — use the owner's allocator; never claim a name you picked. |
| `const DROP_DIR = '/tmp/relay-fixture'` | [Allocate atomically](../SKILL.md#allocate-resources-atomically) — private per-test roots, never predictable shared paths. |
| `process.env.RELAY_TOKEN = 'fixture-token'` | [Contain global state](../SKILL.md#contain-process-global-state) — the environment is an exclusive mutable resource; prefer injection. |
| `delete process.env.RELAY_TOKEN` | [Contain global state](../SKILL.md#contain-process-global-state) — restore the exact prior presence *or* absence. |
| both `setTimeout` waits | [Synchronize on state](../SKILL.md#synchronize-on-state) — a fixed sleep is not evidence that setup completed or that work landed; a timeout may bound a wait, never be the condition that makes an assertion correct. |
| `server.close()` unawaited | [Dispose to quiescence](../SKILL.md#dispose-to-quiescence) — closing without awaiting the completion signal is incomplete teardown. |
| removal with no retry | [Platform-owned semantics](../SKILL.md#respect-platform-owned-semantics) — size a bounded retry to the contention actually observed. |

## What the corrected fixture can now prove

Run it under independent runner processes concurrently, not merely twice in one: the port and the drop directory are the two claims only a second process can falsify. Restoration is provable in-process — a following test asserting that `Object.hasOwn(process.env, 'RELAY_TOKEN')` matches its pre-test value fails against either wrong restore above. Quiescence is provable by asserting that no file appears under the removed root after teardown returns. Set no case timeout unless this fixture genuinely needs one; a literal here **overrides** the lane's budget instead of yielding to it.
