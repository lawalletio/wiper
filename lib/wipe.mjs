import { PrismaClient } from '@prisma/client'

const prisma = globalThis.__wiperPrisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalThis.__wiperPrisma = prisma

export function wipeBody(card) {
  return {
    tag: 'wipe',
    payload: {
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

export async function handleScanCid(req, res, cid) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-allow-headers': 'Content-Type'
    })
    res.end()
    return
  }
  if (req.method && req.method !== 'GET') {
    json(res, 405, { error: 'method not allowed' })
    return
  }
  try {
    const card = await findCardByCid(cid)
    if (!card) {
      json(res, 404, { error: 'not found' })
      return
    }
    json(res, 200, wipeBody(card))
  } catch (err) {
    json(res, 500, { error: err.message })
  }
}
