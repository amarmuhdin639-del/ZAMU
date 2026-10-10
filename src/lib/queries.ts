import 'server-only'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { SETTING_DEFAULTS } from '@/lib/settings-defaults'

export { SETTING_DEFAULTS }

// ---------- store settings (key/value) ----------

export type SettingsMap = Record<string, string>

export async function getSettings(): Promise<SettingsMap> {
  const rows = await db.storeSetting.findMany()
  const map: SettingsMap = {}
  for (const r of rows) map[r.key] = r.value
  return map
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const row = await db.storeSetting.findUnique({ where: { key } })
  return row?.value ?? fallback
}

// ---------- product queries ----------

export type ProductListFilters = {
  q?: string
  category?: string // slug
  minPrice?: number
  maxPrice?: number
  size?: string
  color?: string
  available?: boolean
  onSale?: boolean
  isNew?: boolean
  bestSeller?: boolean
  featured?: boolean
  slugs?: string[]
  sort?: string // newest | price-asc | price-desc | popular | featured
  page?: number
  perPage?: number
}

function buildWhere(f: ProductListFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { active: true }
  if (f.q) {
    where.OR = [
      { name: { contains: f.q } },
      { description: { contains: f.q } },
      { sku: { contains: f.q } },
      { category: { is: { name: { contains: f.q } } } },
    ]
  }
  if (f.category) where.category = { slug: f.category }
  if (f.slugs) where.slug = { in: f.slugs }
  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    where.AND = where.AND || []
    if (f.minPrice !== undefined) where.AND.push({ price: { gte: f.minPrice } })
    if (f.maxPrice !== undefined) where.AND.push({ price: { lte: f.maxPrice } })
  }
  if (f.size) where.sizes = { contains: f.size }
  if (f.color) where.colors = { contains: f.color }
  if (f.available) where.stock = { gt: 0 }
  if (f.onSale) where.salePrice = { not: null }
  if (f.isNew) where.isNew = true
  if (f.bestSeller) where.bestSeller = true
  if (f.featured) where.featured = true
  return where
}

function buildOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc':
      return [{ price: 'asc' }]
    case 'price-desc':
      return [{ price: 'desc' }]
    case 'popular':
      return [{ viewCount: 'desc' }, { createdAt: 'desc' }]
    case 'featured':
      return [{ featured: 'desc' }, { createdAt: 'desc' }]
    default:
      return [{ createdAt: 'desc' }]
  }
}

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  salePrice: true,
  stock: true,
  sizes: true,
  colors: true,
  isNew: true,
  bestSeller: true,
  featured: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' as const }, take: 2, select: { url: true, alt: true } },
  // ratings shown on cards (approved reviews only)
  reviews: { where: { approved: true }, select: { rating: true } },
} satisfies Prisma.ProductSelect

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>

export async function listProducts(f: ProductListFilters) {
  const page = Math.max(1, f.page ?? 1)
  const perPage = Math.min(48, f.perPage ?? 12)
  const where = buildWhere(f)
  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: buildOrderBy(f.sort),
      skip: (page - 1) * perPage,
      take: perPage,
      select: productCardSelect,
    }),
  ])
  return { items, total, page, perPage, pages: Math.ceil(total / perPage) }
}

export async function getProductBySlug(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      reviews: {
        where: { approved: true },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  })
}
