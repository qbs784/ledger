export function sweep(store, now, windowMs) {
  let touched = 0
  for (const record of store.values()) {
    if (now - record.createdAt > windowMs) {
      record.archived = true
      touched += 1
    }
  }
  return touched
}
