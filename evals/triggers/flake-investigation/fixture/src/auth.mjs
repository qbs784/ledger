import { createServer } from 'node:http'

// A token is valid until the end of the *whole millisecond window* it was
// issued in, so how much life a fresh token has depends on where in the window
// it was issued: anywhere from the full window down to almost nothing.
const WINDOW_MS = 180

export function issue() {
  const window = Math.floor(Date.now() / WINDOW_MS)
  return { window, expiresAt: (window + 1) * WINDOW_MS }
}

export function isValid(token, now = Date.now()) {
  return now < token.expiresAt
}

export function serve(port) {
  const server = createServer((request, response) => {
    response.writeHead(request.headers.authorization ? 200 : 401).end()
  })
  return new Promise((done, fail) => {
    server.once('error', fail)
    server.listen(port, '127.0.0.1', () => done(server))
  })
}
