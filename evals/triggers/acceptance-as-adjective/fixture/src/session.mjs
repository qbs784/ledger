// Session store.
//
// `lastSeen` is stamped by touch(), which the write path calls. The read path
// does not call it.

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000
const sessions = new Map()

export function create(id, now) {
  sessions.set(id, { id, lastSeen: now })
}

export function touch(id, now) {
  const session = sessions.get(id)
  if (session) session.lastSeen = now
}

export function read(id) {
  return sessions.get(id) ?? null
}

export function write(id, value, now) {
  const session = sessions.get(id)
  if (!session) return false
  session.value = value
  touch(id, now)
  return true
}

export function isExpired(id, now) {
  const session = sessions.get(id)
  return session === undefined || now - session.lastSeen > EXPIRY_MS
}
