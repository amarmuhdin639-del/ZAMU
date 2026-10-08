import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Removes ALL seeded/AI demo content so the family starts with a clean store:
//  - every demo product (+ cascading images, reviews, favorites)
//  - the demo banner row
//  - heroImage setting (homepage falls back to the typographic Z poster)
//  - the AI-generated image files under public/uploads/products and /site
// Categories, payment methods, delivery zones and the admin account are KEPT.

const db = new PrismaClient()

const SITE_DIR = path.join(process.cwd(), 'public', 'uploads', 'site')
const PRODUCTS_DIR = path.join(process.cwd(), 'public', 'uploads', 'products')

function cleanDir(dir: string) {
  if (!fs.existsSync(dir)) return []
  const removed: string[] = []
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    if (fs.statSync(full).isFile()) {
      fs.unlinkSync(full)
      removed.push(path.relative(process.cwd(), full))
    }
  }
  return removed
}

async function main() {
  const products = await db.product.deleteMany({})
  const banners = await db.banner.deleteMany({})
  // categories keep their names/descriptions but lose the AI artwork
  const catImages = await db.category.updateMany({ data: { image: null } })
  await db.storeSetting.upsert({
    where: { key: 'heroImage' },
    create: { key: 'heroImage', value: '' },
    update: { value: '' },
  })
  await db.storeSetting.upsert({
    where: { key: 'heroVideo' },
    create: { key: 'heroVideo', value: '' },
    update: { value: '' },
  })

  const files = [...cleanDir(PRODUCTS_DIR), ...cleanDir(SITE_DIR)]
  fs.mkdirSync(SITE_DIR, { recursive: true })
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true })

  console.log(`deleted ${products.count} products, ${banners.count} banners, ${catImages.count} category images, ${files.length} image files`)
  console.log(`remaining products: ${await db.product.count()}, reviews: ${await db.review.count()}`)
  const kept = {
    categories: await db.category.count(),
    methods: await db.paymentMethod.count(),
    zones: await db.deliveryZone.count(),
  }
  console.log('kept (categories/methods/zones):', JSON.stringify(kept))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
