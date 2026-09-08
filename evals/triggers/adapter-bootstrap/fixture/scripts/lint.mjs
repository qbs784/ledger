// Rejects a tab in any source file. Small, but it really runs and really fails.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

let bad = 0
for (const dir of ['src', 'test', 'scripts']) {
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.mjs')) continue
    const path = join(dir, name)
    if (readFileSync(path, 'utf8').includes('\t')) {
      console.error(`${path}: contains a tab`)
      bad += 1
    }
  }
}
if (bad > 0) process.exit(1)
console.log('lint: clean')
