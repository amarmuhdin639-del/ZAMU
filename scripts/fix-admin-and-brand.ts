import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  // 1) Admin credentials the owner actually uses: identifier "admin" / "12345678"
  const admin = await db.user.findFirst({ where: { role: 'ADMIN' } })
  if (admin) {
    await db.user.update({
      where: { id: admin.id },
      data: { email: 'admin', passwordHash: hashPassword('12345678') },
    })
    console.log('✓ admin user updated: identifier=admin, password=12345678')
  } else {
    await db.user.create({
      data: {
        name: 'Store Admin',
        email: 'admin',
        passwordHash: hashPassword('12345678'),
        role: 'ADMIN',
      },
    })
    console.log('✓ admin user created: identifier=admin, password=12345678')
  }

  // 2) GTA Fashion rebrand in the live settings
  const brandUpdates: Record<string, string> = {
    siteName: 'GTA',
    contactEmail: 'hello@gtafashion.et',
    contactTelegram: 'gtafashion.et',
    contactInstagram: 'gtafashion.et',
    contactFacebook: 'gtafashion.et',
  }
  for (const [key, value] of Object.entries(brandUpdates)) {
    const existing = await db.storeSetting.findUnique({ where: { key } })
    if (existing) {
      await db.storeSetting.update({ where: { key }, data: { value } })
    } else {
      await db.storeSetting.create({ data: { key, value } })
    }
  }
  console.log('✓ store settings rebranded: siteName=GTA, contacts → gtafashion.et')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
