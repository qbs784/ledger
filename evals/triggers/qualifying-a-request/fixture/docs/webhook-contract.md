# Webhook delivery contract

Published with 2.0.0. Consumers integrate against this page.

- **At-most-once delivery.** Each event is POSTed exactly one time. A failed
  delivery is dropped and surfaces in the sender's dead-letter report; it is
  never re-sent.
- **`x-delivery-attempt`** is always `1`. It exists so the field is available
  if delivery semantics ever change, and consumers are told they may assert on
  it.
- **`x-event-id`** is stable across the life of the event.

Two integrators have written to say they skip their own deduplication because
of the at-most-once guarantee.
