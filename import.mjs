import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const dumpPath = process.argv[2] ?? '/Users/agustinkassis/Downloads/ntag424s_dump.sql'
const prisma = new PrismaClient()

const text = readFileSync(dumpPath, 'utf8')
const marker = 'COPY public.ntag424s (cid, k0, k1, k2, k3, k4, ctr, otc, design_uuid) FROM stdin;\n'
const start = text.indexOf(marker)
if (start === -1) throw new Error('COPY section not found')
const bodyStart = start + marker.length
const end = text.indexOf('\n\\.\n', bodyStart)
if (end === -1) throw new Error('COPY terminator not found')

const rows = text
  .slice(bodyStart, end)
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [cid, k0, k1, k2, k3, k4, ctr, otc, designUuid] = line.split('\t')
    return {
      cid,
      k0,
      k1,
      k2,
      k3,
      k4,
      ctr: Number(ctr),
      otc: otc === '\\N' ? null : otc,
      designUuid
    }
  })

console.log(`parsed ${rows.length} rows`)

const BATCH = 500
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH)
  const result = await prisma.ntag424.createMany({ data: chunk, skipDuplicates: true })
  console.log(`${Math.min(i + BATCH, rows.length)}/${rows.length} (+${result.count})`)
}

const total = await prisma.ntag424.count()
console.log(`done. table count: ${total}`)
await prisma.$disconnect()
