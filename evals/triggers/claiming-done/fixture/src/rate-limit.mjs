export function createLimiter({ capacity, refillPerSecond }) {
  let tokens = capacity
  let last = Date.now()

  return {
    tryTake(now = Date.now()) {
      const elapsed = (now - last) / 1000
      tokens = Math.min(capacity, tokens + elapsed * refillPerSecond)
      last = now
      if (tokens < 1) return false
      tokens -= 1
      return true
    },
    remaining() {
      return Math.floor(tokens)
    },
  }
}
