#!/usr/bin/env node
import { DEFAULT_PORT, start } from '../src/server.mjs'

const args = process.argv.slice(2)
if (args[0] === '--version') {
  console.log('acme 0.4.1')
  process.exit(0)
}
const portFlag = args.indexOf('--port')
const port = portFlag === -1 ? DEFAULT_PORT : Number(args[portFlag + 1])
const { url } = start({ port })
console.log(`acme listening on ${url}`)
