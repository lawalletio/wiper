import { PrismaClient } from '@prisma/client'

const prisma = globalThis.__wiperPrisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalThis.__wiperPrisma = prisma

export function wipePayload(card) {
  return {
    action: 'wipe',
    k0: card.k0,
    k1: card.k1,
    k2: card.k2,
    k3: card.k3,
    k4: card.k4,
    uid: card.cid,
    version: 1
  }
}

/** Keys as Bolt NFC v0.3.0 `boltcard://reset?url=` fetch expects. */
export function boltResetKeys(card, lnurlw) {
  return {
    K0: card.k0,
    K1: card.k1,
    K2: card.k2,
    K3: card.k3,
    K4: card.k4,
    k0: card.k0,
    k1: card.k1,
    k2: card.k2,
    k3: card.k3,
    k4: card.k4,
    LNURLW: lnurlw,
    action: 'wipe',
    uid: card.cid,
    version: 1
  }
}

export function json(res, status, body) {
  res.setHeader('content-type', 'application/json')
  res.setHeader('access-control-allow-origin', '*')
  res.statusCode = status
  res.end(JSON.stringify(body))
}

export async function findCardByCid(cid) {
  const id = String(cid || '').trim()
  if (!id) return null
  return prisma.ntag424.findFirst({
    where: { cid: { equals: id, mode: 'insensitive' } }
  })
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString())
  } catch {
    return {}
  }
}

function requestHost(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost')
}

function hexUid(raw) {
  return String(raw || '')
    .replace(/[\s:.-]/g, '')
    .toLowerCase()
}

export async function handleScanCid(req, res, cid) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'Content-Type'
    })
    res.end()
    return
  }
  const method = req.method || 'GET'
  if (method !== 'GET' && method !== 'POST') {
    json(res, 405, { error: 'method not allowed' })
    return
  }
  try {
    const card = await findCardByCid(cid)
    if (!card) {
      json(res, 404, { error: 'not found' })
      return
    }
    if (method === 'POST') {
      const body = await readJsonBody(req)
      const postedUid = hexUid(body.UID || body.uid)
      if (postedUid && postedUid !== hexUid(card.cid)) {
        json(res, 404, { error: 'not found' })
        return
      }
      const host = requestHost(req)
      json(res, 200, boltResetKeys(card, `lnurlw://${host}/card/scan/${card.cid}`))
      return
    }
    json(res, 200, wipePayload(card))
  } catch (err) {
    json(res, 500, { error: err.message })
  }
}
