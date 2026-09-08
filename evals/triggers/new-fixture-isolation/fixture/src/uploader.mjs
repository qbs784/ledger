import { createServer } from 'node:http'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function serve({ port, directory }) {
  const server = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    await writeFile(join(directory, 'upload.bin'), Buffer.concat(chunks))
    response.writeHead(204).end()
  })
  await new Promise(done => server.listen(port, '127.0.0.1', done))
  return server
}
