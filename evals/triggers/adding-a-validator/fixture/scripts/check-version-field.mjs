// Rejects a config file that has no `version` field.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

let bad = 0
for (const name of readdirSync('config')) {
  if (!name.endsWith('.json')) continue
  const path = join('config', name)
  const parsed = JSON.parse(readFileSync(path, 'utf8'))
  if (parsed.version === undefined) {
    console.error(`${path}: no version field`)
    bad += 1
  }
}
if (bad > 0) process.exit(1)
console.log(`check-version-field: ${readdirSync('config').length} file(s) clean`)
