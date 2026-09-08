# widget-store

A small key-value store for widgets.

## Install

    npm install widget-store

## Usage

Create a store and put things in it. The store is a small key-value store for
widgets. You create it, and then you put widgets in it, and later you get them
back out again by key.

    const store = new WidgetStore()
    store.put('a', widget)
    store.get('a')

## Configuration

The store takes options. The options are passed to the constructor. The
constructor accepts an options object. Options are optional.

- `maxEntries` — the maximum number of entries. Defaults to 1000.
- `ttlSeconds` — how long an entry lives. Defaults to 3600.
- `onEvict` — called when an entry is evicted.

## Durability

`put` returns once the entry is in memory. It does not fsync. A process crash
after `put` returns loses entries written since the last flush; call `flush()`
and await it when a write must survive a crash.

## API

See the source for the full API. The API is documented in the source. Read the
source for details about the API.
