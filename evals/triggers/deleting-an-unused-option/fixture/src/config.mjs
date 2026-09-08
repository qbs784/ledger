export const DEFAULTS = {
  timeoutMs: 30_000,
  retryBackoff: 'exponential',
  maxRetries: 3,
}

export function resolve(overrides = {}) {
  return { ...DEFAULTS, ...overrides }
}
