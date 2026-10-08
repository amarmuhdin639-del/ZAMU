/**
 * Recreates the store owner's product that was wiped by a sandbox restore.
 * Data taken from the owner's screenshot (product card):
 *   Utility Crossbody Bag · Jerseys · ETB 4,449 (was 23,942, -81%)
 *   sizes S M L XL XS XXL · Black · NEW badge
 * No image is attached — the owner re-uploads their own photo via admin.
 * Run: bun scripts/recreate-crossbody.ts
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const existing = await db.product.findUnique({ where: { slug: 'utility-crossbody-bag' } })
  if (existing) {
    console.log('Product already exists:', existing.id)
    return
  }
  const jerseys = await db.category.findFirst({ where: { name: 'Jerseys' } })
  if (!jerseys) throw new Error('Jerseys category not found')

  const product = await db.product.create({
    data: {
      name: 'Utility Crossbody Bag',
      slug: 'utility-crossbody-bag',
      sku: 'ZAM-UCB-001',
      description:
        'Everyday utility crossbody bag with an adjustable strap and zip-secured main pocket. Compact, durable and made for daily carry.',
      price: 23942,
      salePrice: 4449,
      categoryId: jerseys.id,
      stock: 25,
      sizes: 'S,M,L,XL,XS,XXL',
      colors: JSON.stringify([{ name: 'Black', hex: '#111111' }]),
      isNew: true,
      active: true,
      featured: false,
      bestSeller: false,
    },
  })
  console.log('Created:', product.id, product.slug)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
