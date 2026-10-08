import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  // payment methods
  const pms = await db.paymentMethod.findMany()
  for (const pm of pms) {
    if (pm.accountName.includes('TIBEB')) {
      await db.paymentMethod.update({ where: { id: pm.id }, data: { accountName: pm.accountName.replaceAll('TIBEB Family Store (DEMO)', 'ZAMU Family Store (DEMO)').replaceAll('TIBEB', 'ZAMU') } })
      console.log('paymentMethod fixed:', pm.name)
    }
  }
  // delivery zones
  const dzs = await db.deliveryZone.findMany()
  for (const dz of dzs) {
    if (dz.name.toUpperCase().includes('TIBEB')) {
      await db.deliveryZone.update({ where: { id: dz.id }, data: { name: dz.name.replaceAll('TIBEB', 'ZAMU') } })
      console.log('deliveryZone fixed:', dz.name)
    }
  }
  // settings rows
  const ss = await db.storeSetting.findMany()
  for (const s of ss) {
    if (s.value.toUpperCase().includes('TIBEB') && s.key !== 'heroImage') {
      await db.storeSetting.update({ where: { key: s.key }, data: { value: s.value.replaceAll('TIBEB Family Store (DEMO)', 'ZAMU Family Store (DEMO)').replaceAll('TIBEB', 'ZAMU').replaceAll('tibeb', 'zamu') } })
      console.log('setting fixed:', s.key)
    }
  }
  // discounts / banners / categories / products names
  const dc = await db.discountCode.findMany()
  for (const d of dc) {
    if (d.code.toUpperCase().includes('TIBEB')) {
      await db.discountCode.update({ where: { id: d.id }, data: { code: d.code.replaceAll('TIBEB', 'ZAMU') } })
      console.log('discount fixed:', d.code)
    }
  }
  const bn = await db.banner.findMany()
  for (const b of bn) {
    if ((b.title + (b.subtitle ?? '')).toUpperCase().includes('TIBEB')) {
      await db.banner.update({ where: { id: b.id }, data: { title: b.title.replaceAll('TIBEB', 'ZAMU'), subtitle: b.subtitle?.replaceAll('TIBEB', 'ZAMU') ?? null } })
      console.log('banner fixed:', b.title)
    }
  }
  console.log('done')
}

main().finally(() => db.$disconnect())
