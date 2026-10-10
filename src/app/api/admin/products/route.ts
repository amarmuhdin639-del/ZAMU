import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/shared'

const productSchema = z.object({
  name: z.string().min(2).max(120),
  sku: z.string().min(2).max(40),
  description: z.string().min(10).max(5000),
  price: z.number().positive().max(1000000),
  salePrice: z.number().positive().max(1000000).nullable().optional(),
  categoryId: z.string().min(1),
  customCategory: z.string().max(80).nullable().optional(),
  stock: z.number().int().min(0).max(100000),
  sizes: z.string().min(1).max(100),
  colors: z.string().min(2).max(4000),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  bestSeller: z.boolean().optional(),
  active: z.boolean().optional(),
  images: z.array(z.object({ url: z.string().min(1).max(300), alt: z.string().max(150).optional() })).max(8).optional(),
})

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const sp = req.nextUrl.searchParams
  const q = sp.get('q') ?? ''
  const products = await db.product.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
    },
    take: 200,
  })
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = productSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product data' }, { status: 400 })
  }
  const d = parsed.data
  const baseSlug = slugify(d.name)
  let slug = baseSlug
  for (let i = 1; i < 50; i++) {
    const exists = await db.product.findUnique({ where: { slug } })
    if (!exists) break
    slug = `${baseSlug}-${i}`
  }
  const skuExists = await db.product.findUnique({ where: { sku: d.sku } })
  if (skuExists) return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })

  const product = await db.product.create({
    data: {
      name: d.name,
      slug,
      sku: d.sku,
      description: d.description,
      price: d.price,
      salePrice: d.salePrice ?? null,
      categoryId: d.categoryId,
      customCategory: d.customCategory ?? null,
      stock: d.stock,
      sizes: d.sizes,
      colors: d.colors,
      featured: d.featured ?? false,
      isNew: d.isNew ?? false,
      bestSeller: d.bestSeller ?? false,
      active: d.active ?? true,
      images: d.images?.length ? { create: d.images.map((img, i) => ({ url: img.url, alt: img.alt ?? d.name, sortOrder: i })) } : undefined,
    },
  })

  await db.auditLog.create({
    data: { adminId: admin.id, adminName: admin.name, action: 'PRODUCT_CREATED', details: `Created product ${d.name} (${d.sku})` },
  })
  return NextResponse.json({ product })
}
