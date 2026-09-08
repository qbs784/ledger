# Workers

The render worker takes a token set and returns a rasterised sheet.

We originally tried doing this on the main thread, and that is why the API is
callback-shaped rather than promise-shaped. As mentioned above, a later PR wires
the worker into theming.

## Lifecycle

`start()` resolves once the worker has acknowledged the handshake. `stop()`
waits for in-flight work to finish before terminating.
