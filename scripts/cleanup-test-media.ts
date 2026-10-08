import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Removes the QA test image uploaded during download-stack verification.
const prisma = new PrismaClient()
const marker = '-3a2aa75dbe27.png'

async function main() {
  const assets = await prisma.mediaAsset.findMany({
    where: { path: { contains: marker } },
  })
  for (const a of assets) {
    await prisma.mediaAsset.delete({ where: { id: a.id } })
    const disk = path.join(process.cwd(), 'public', 'uploads', a.path.replace(/^\/?api\/media\//, '').replace(/^\/?uploads\//, ''))
    try {
      if (fs.existsSync(disk)) fs.unlinkSync(disk)
    } catch {
      /* ignore */
    }
    console.log('deleted MediaAsset', a.path)
  }
  if (assets.length === 0) console.log('nothing to clean')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
