import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Post-verification cleanup for the "Others category + upload pipeline" QA run:
//  - deletes the QA test product (slug qa-others-test) and its image rows
//  - removes the two legacy QA files under public/uploads/products/
//  - removes any MediaAsset rows pointing at those paths
const prisma = new PrismaClient()

const MARKERS = ['muw2ps57-23867ad3bafe.png', 'muzr17k2-baa8af97be00.png']

async function main() {
  // 1) QA product (its image rows cascade or are deleted explicitly)
  const qa = await prisma.product.findUnique({ where: { slug: 'qa-others-test' }, include: { images: true } })
  if (qa) {
    await prisma.productImage.deleteMany({ where: { productId: qa.id } })
    await prisma.product.delete({ where: { id: qa.id } })
    console.log('deleted QA product', qa.slug)
  } else {
    console.log('no QA product found')
  }

  // 2) legacy QA files + their MediaAsset rows
  for (const marker of MARKERS) {
    const rel = `products/${marker}`
    try {
      await prisma.mediaAsset.deleteMany({ where: { path: rel } })
    } catch {
      /* ignore */
    }
    const disk = path.join(process.cwd(), 'public', 'uploads', rel)
    try {
      if (fs.existsSync(disk)) {
        fs.unlinkSync(disk)
        console.log('deleted disk file', rel)
      }
    } catch {
      /* ignore */
    }
  }

  const products = await prisma.product.count()
  const assets = await prisma.mediaAsset.count()
  console.log(`remaining products: ${products}, media assets: ${assets}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
