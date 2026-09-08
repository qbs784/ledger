export const DEFAULT_PORT = 7420

export function start({ port = DEFAULT_PORT } = {}) {
  return { port, url: `http://127.0.0.1:${port}` }
}
