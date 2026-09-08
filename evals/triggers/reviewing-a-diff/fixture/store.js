// A tiny write-through cache in front of a record store.
export class RecordStore {
  constructor(backend) {
    this.backend = backend
    this.cache = new Map()
  }

  async get(id) {
    if (this.cache.has(id)) return this.cache.get(id)
    const record = await this.backend.read(id)
    this.cache.set(id, record)
    return record
  }

  async put(id, record) {
    await this.backend.write(id, record)
    this.cache.set(id, record)
  }
}
