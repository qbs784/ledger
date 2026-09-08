import { mkdirSync, copyFileSync, readdirSync } from 'node:fs'
mkdirSync('lib', { recursive: true })
for (const name of readdirSync('src')) copyFileSync(`src/${name}`, `lib/${name}`)
console.log('build: wrote lib/')
