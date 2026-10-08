import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.category.findUnique({ where: { slug: 'others' } })
  if (existing) {
    console.log('Others category already exists:', existing.id)
    return
  }
  const max = await prisma.category.aggregate({ _max: { sortOrder: true } })
  const sortOrder = (max._max.sortOrder ?? 0) + 10
  const cat = await prisma.category.create({
    data: {
      name: 'Others',
      slug: 'others',
      description: 'Everything else — any style the family adds next.',
      sortOrder,
      active: true,
    },
  })
  console.log('created category:', JSON.stringify(cat))
  const all = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { name: true, slug: true, sortOrder: true } })
  console.log('categories now:', all.map((c) => `${c.name}(${c.sortOrder})`).join(' '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
