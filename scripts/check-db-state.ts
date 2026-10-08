import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const settings = await db.storeSetting.findMany()
  console.log('=== SETTINGS ===')
  for (const s of settings) console.log(`${s.key} = ${s.value}`)

  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, phone: true, role: true, passwordHash: true },
  })
  console.log('=== USERS ===')
  for (const u of users) {
    console.log(`${u.role} | name=${u.name} | email=${u.email} | phone=${u.phone} | hasPw=${!!u.passwordHash}`)
  }

  const sessions = await db.session.count()
  console.log('=== SESSIONS:', sessions)

  const products = await db.product.count()
  console.log('=== PRODUCTS:', products)

  const orders = await db.order.count()
  console.log('=== ORDERS:', orders)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
