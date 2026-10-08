import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  await db.storeSetting.upsert({
    where: { key: 'heroImage' },
    update: { value: '/uploads/site/hero3.jpg' },
    create: { key: 'heroImage', value: '/uploads/site/hero3.jpg' },
  })
  console.log('✓ heroImage → /uploads/site/hero3.jpg')
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
