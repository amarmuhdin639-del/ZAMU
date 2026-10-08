import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, images: true, categoryId: true },
  })
  console.log('=== PRODUCTS ===')
  for (const p of products) {
    console.log(JSON.stringify({ name: p.name, slug: p.slug, images: p.images }))
  }
  console.log('=== CATEGORIES ===')
  const cats = await prisma.category.findMany({ select: { id: true, name: true, slug: true, image: true } })
  for (const c of cats) console.log(JSON.stringify(c))
  console.log('=== MEDIA ASSETS ===')
  const assets = await prisma.mediaAsset.findMany({ select: { path: true, size: true, mime: true } })
  for (const a of assets) console.log(`${a.path} | ${a.mime} | ${a.size}B`)
  console.log(`total media assets: ${assets.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
