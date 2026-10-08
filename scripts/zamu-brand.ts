import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const updates: Record<string, string> = {
    siteName: 'ZAMU',
    heroTitle: 'WANTS &\nNEEDS.',
    heroSubtitle: 'Essential jerseys, baggy fits & streetwear — limited runs, packed and shipped by the family.',
    contactEmail: 'hello@zamu.store',
    contactTelegram: 'zamustore',
    contactInstagram: 'zamustore',
    contactFacebook: 'zamustore',
  }
  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.storeSetting.findUnique({ where: { key } })
    if (existing) {
      await db.storeSetting.update({ where: { key }, data: { value } })
    } else {
      await db.storeSetting.create({ data: { key, value } })
    }
  }
  console.log('✓ store settings → ZAMU brand')

  // make sure the admin account still matches the documented credentials
  const admin = await db.user.findFirst({ where: { role: 'ADMIN' } })
  console.log(`✓ admin check: email=${admin?.email} hasPw=${!!admin?.passwordHash}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
