# widget-store

A small key-value store for widgets.

## Install

```sh
npm install widget-store
```

## Usage

Create a store and put things in it:

```js
import { createStore } from 'widget-store'

const store = createStore({ maxEntries: 100 })
store.put('a', { size: 1 })
console.log(store.get('a'))
```

The store exposes the following methods:

| Method | Behaviour |
|---|---|
| `put(key, value)` | Stores `value` under `key`. Overwrites silently. |
| `get(key)` | Returns the stored value, or `undefined`. |
| `delete(key)` | Removes the entry. Returns whether anything was removed. |
| `has(key)` | Returns whether the key is present, without touching eviction order. |
| `keys()` | Returns an iterator over the keys, in insertion order. |
| `values()` | Returns an iterator over the values, in insertion order. |
| `entries()` | Returns an iterator over `[key, value]` pairs. |
| `size()` | Returns the number of entries. |
| `clear()` | Removes every entry. |
| `putMany(pairs)` | Stores every pair. Eviction runs once at the end. |
| `getMany(keys)` | Returns an array of values, `undefined` where absent. |
| `deleteMany(keys)` | Removes every named entry. Returns how many were removed. |
| `touch(key)` | Moves the key to the newest position in eviction order. |
| `peek(key)` | Reads without changing eviction order. |
| `prune(predicate)` | Removes every entry for which the predicate returns true. |
| `toJSON()` | Returns a plain object of the whole map. |
| `fromJSON(object)` | Replaces the contents with the given object. |
| `flush()` | Waits for any pending persistence write to finish. |
| `close()` | Flushes, then refuses further mutations. |
| `stats()` | Returns hit, miss and eviction counts since construction. |

Configuration is passed to `createStore`:

| Option | Default | Meaning |
|---|---|---|
| `maxEntries` | `10000` | Evicts the oldest entry once this many are stored. |
| `persist` | `false` | Writes to `path` after every mutation. |
| `path` | `.widget-store.json` | Where `persist` writes. |
| `onEvict` | `undefined` | Called with the evicted key and value. |
| `ttlMs` | `undefined` | Entries older than this are treated as absent. |
| `clock` | `Date.now` | Injected for tests. |
| `serialize` | `JSON.stringify` | How `persist` encodes the map. |
| `deserialize` | `JSON.parse` | How the map is decoded at construction. |
| `caseInsensitive` | `false` | Lower-cases every key on the way in. |
| `freeze` | `false` | Deep-freezes stored values. |
| `maxBytes` | `undefined` | Evicts once the serialized size exceeds this. |
| `onError` | `throw` | What to do when a persistence write fails. |

### Example: `put(key, value)`

```js
const store = createStore()
store.put('a')
```

Stores `value` under `key`. Overwrites silently.

### Example: `get(key)`

```js
const store = createStore()
store.get('a')
```

Returns the stored value, or `undefined`.

### Example: `delete(key)`

```js
const store = createStore()
store.delete('a')
```

Removes the entry. Returns whether anything was removed.

### Example: `has(key)`

```js
const store = createStore()
store.has('a')
```

Returns whether the key is present, without touching eviction order.

### Example: `keys()`

```js
const store = createStore()
store.keys('a')
```

Returns an iterator over the keys, in insertion order.

### Example: `values()`

```js
const store = createStore()
store.values()
```

Returns an iterator over the values, in insertion order.

### Example: `entries()`

```js
const store = createStore()
store.entries()
```

Returns an iterator over `[key, value]` pairs.

### Example: `size()`

```js
const store = createStore()
store.size()
```

Returns the number of entries.

### Example: `clear()`

```js
const store = createStore()
store.clear()
```

Removes every entry.

### Example: `putMany(pairs)`

```js
const store = createStore()
store.putMany()
```

Stores every pair. Eviction runs once at the end.

### Example: `getMany(keys)`

```js
const store = createStore()
store.getMany('a')
```

Returns an array of values, `undefined` where absent.

### Example: `deleteMany(keys)`

```js
const store = createStore()
store.deleteMany('a')
```

Removes every named entry. Returns how many were removed.

### Example: `touch(key)`

```js
const store = createStore()
store.touch('a')
```

Moves the key to the newest position in eviction order.

### Example: `peek(key)`

```js
const store = createStore()
store.peek('a')
```

Reads without changing eviction order.

### Example: `prune(predicate)`

```js
const store = createStore()
store.prune()
```

Removes every entry for which the predicate returns true.

### Example: `toJSON()`

```js
const store = createStore()
store.toJSON()
```

Returns a plain object of the whole map.

### Example: `fromJSON(object)`

```js
const store = createStore()
store.fromJSON()
```

Replaces the contents with the given object.

### Example: `flush()`

```js
const store = createStore()
store.flush()
```

Waits for any pending persistence write to finish.

### Example: `close()`

```js
const store = createStore()
store.close()
```

Flushes, then refuses further mutations.

### Example: `stats()`

```js
const store = createStore()
store.stats()
```

Returns hit, miss and eviction counts since construction.

## API Reference

Every method of a store, in full.

### `put(key, value)`

Stores `value` under `key`. Overwrites silently.

```js
const store = createStore()
store.put()
```

### `get(key)`

Returns the stored value, or `undefined`.

```js
const store = createStore()
store.get()
```

### `delete(key)`

Removes the entry. Returns whether anything was removed.

```js
const store = createStore()
store.delete()
```

### `has(key)`

Returns whether the key is present, without touching eviction order.

```js
const store = createStore()
store.has()
```

### `keys()`

Returns an iterator over the keys, in insertion order.

```js
const store = createStore()
store.keys()
```

### `values()`

Returns an iterator over the values, in insertion order.

```js
const store = createStore()
store.values()
```

### `entries()`

Returns an iterator over `[key, value]` pairs.

```js
const store = createStore()
store.entries()
```

### `size()`

Returns the number of entries.

```js
const store = createStore()
store.size()
```

### `clear()`

Removes every entry.

```js
const store = createStore()
store.clear()
```

### `putMany(pairs)`

Stores every pair. Eviction runs once at the end.

```js
const store = createStore()
store.putMany()
```

### `getMany(keys)`

Returns an array of values, `undefined` where absent.

```js
const store = createStore()
store.getMany()
```

### `deleteMany(keys)`

Removes every named entry. Returns how many were removed.

```js
const store = createStore()
store.deleteMany()
```

### `touch(key)`

Moves the key to the newest position in eviction order.

```js
const store = createStore()
store.touch()
```

### `peek(key)`

Reads without changing eviction order.

```js
const store = createStore()
store.peek()
```

### `prune(predicate)`

Removes every entry for which the predicate returns true.

```js
const store = createStore()
store.prune()
```

### `toJSON()`

Returns a plain object of the whole map.

```js
const store = createStore()
store.toJSON()
```

### `fromJSON(object)`

Replaces the contents with the given object.

```js
const store = createStore()
store.fromJSON()
```

### `flush()`

Waits for any pending persistence write to finish.

```js
const store = createStore()
store.flush()
```

### `close()`

Flushes, then refuses further mutations.

```js
const store = createStore()
store.close()
```

### `stats()`

Returns hit, miss and eviction counts since construction.

```js
const store = createStore()
store.stats()
```

### Options, in full

### `maxEntries`

Default: `10000`.

Evicts the oldest entry once this many are stored.

### `persist`

Default: `false`.

Writes to `path` after every mutation.

### `path`

Default: `.widget-store.json`.

Where `persist` writes.

### `onEvict`

Default: `undefined`.

Called with the evicted key and value.

### `ttlMs`

Default: `undefined`.

Entries older than this are treated as absent.

### `clock`

Default: `Date.now`.

Injected for tests.

### `serialize`

Default: `JSON.stringify`.

How `persist` encodes the map.

### `deserialize`

Default: `JSON.parse`.

How the map is decoded at construction.

### `caseInsensitive`

Default: `false`.

Lower-cases every key on the way in.

### `freeze`

Default: `false`.

Deep-freezes stored values.

### `maxBytes`

Default: `undefined`.

Evicts once the serialized size exceeds this.

### `onError`

Default: `throw`.

What to do when a persistence write fails.

### Is it safe to call `put` from two places at once? (1)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (2)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (3)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (4)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (5)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (6)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (7)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (8)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (9)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (10)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (11)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (12)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (13)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (14)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (15)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (16)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (17)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (18)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (19)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (20)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (21)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (22)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (23)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (24)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (25)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (26)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (27)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (28)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (29)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (30)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (31)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (32)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (33)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (34)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (35)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (36)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (37)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (38)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (39)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (40)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (41)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (42)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (43)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (44)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (45)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (46)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (47)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (48)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (49)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (50)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (51)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (52)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (53)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (54)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (55)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (56)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (57)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (58)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (59)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (60)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (61)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (62)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (63)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (64)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (65)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (66)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (67)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (68)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (69)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (70)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (71)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (72)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (73)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (74)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (75)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (76)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (77)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (78)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (79)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (80)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (81)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (82)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (83)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (84)

Yes. The store is synchronous, so a call completes before the next begins.

### Is it safe to call `put` from two places at once? (85)

Yes. The store is synchronous, so a call completes before the next begins.

## Configuration

All options, again, with the same defaults:

| Option | Default | Meaning |
|---|---|---|
| `maxEntries` | `10000` | Evicts the oldest entry once this many are stored. |
| `persist` | `false` | Writes to `path` after every mutation. |
| `path` | `.widget-store.json` | Where `persist` writes. |
| `onEvict` | `undefined` | Called with the evicted key and value. |
| `ttlMs` | `undefined` | Entries older than this are treated as absent. |
| `clock` | `Date.now` | Injected for tests. |
| `serialize` | `JSON.stringify` | How `persist` encodes the map. |
| `deserialize` | `JSON.parse` | How the map is decoded at construction. |
| `caseInsensitive` | `false` | Lower-cases every key on the way in. |
| `freeze` | `false` | Deep-freezes stored values. |
| `maxBytes` | `undefined` | Evicts once the serialized size exceeds this. |
| `onError` | `throw` | What to do when a persistence write fails. |

The methods available on the configured store:

| Method | Behaviour |
|---|---|
| `put(key, value)` | Stores `value` under `key`. Overwrites silently. |
| `get(key)` | Returns the stored value, or `undefined`. |
| `delete(key)` | Removes the entry. Returns whether anything was removed. |
| `has(key)` | Returns whether the key is present, without touching eviction order. |
| `keys()` | Returns an iterator over the keys, in insertion order. |
| `values()` | Returns an iterator over the values, in insertion order. |
| `entries()` | Returns an iterator over `[key, value]` pairs. |
| `size()` | Returns the number of entries. |
| `clear()` | Removes every entry. |
| `putMany(pairs)` | Stores every pair. Eviction runs once at the end. |
| `getMany(keys)` | Returns an array of values, `undefined` where absent. |
| `deleteMany(keys)` | Removes every named entry. Returns how many were removed. |
| `touch(key)` | Moves the key to the newest position in eviction order. |
| `peek(key)` | Reads without changing eviction order. |
| `prune(predicate)` | Removes every entry for which the predicate returns true. |
| `toJSON()` | Returns a plain object of the whole map. |
| `fromJSON(object)` | Replaces the contents with the given object. |
| `flush()` | Waits for any pending persistence write to finish. |
| `close()` | Flushes, then refuses further mutations. |
| `stats()` | Returns hit, miss and eviction counts since construction. |

## Persistence

With `persist: true` the store writes the whole map to `path` after every
mutation. There is no partial write and no locking, so two processes
sharing one path will overwrite each other.

## Eviction

Once `maxEntries` is reached the oldest entry by insertion order is removed
and `onEvict` is called with its key and value.

## License

MIT
