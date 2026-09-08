import { resolve } from './config.mjs'

// The only reader of retryBackoff, and it reaches it through the resolved
// object rather than by name — so a grep for `retryBackoff` in call sites
// finds nothing.
const DELAY = {
  exponential: attempt => 2 ** attempt * 100,
  linear: attempt => attempt * 100,
}

export async function withRetries(operation, overrides) {
  const config = resolve(overrides)
  const delayFor = DELAY[config.retryBackoff]
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= config.maxRetries) throw error
      await new Promise(done => setTimeout(done, delayFor(attempt)))
    }
  }
}
