import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleScanCid } from './lib/wipe.mjs'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'
const indexHtml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'public/index.html')
)

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const scan = path.match(/^\/card\/scan\/([^/]+)$/)
  if (scan) {
    await handleScanCid(req, res, decodeURIComponent(scan[1]))
    return
  }
  if (path === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(indexHtml)
    return
  }
  res.writeHead(404)
  res.end('not found')
})

server.listen(PORT, HOST, () => {
  console.log(`http://127.0.0.1:${PORT}`)
})
