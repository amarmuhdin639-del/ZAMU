import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  sku: z.string().min(2).max(40).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: z.number().positive().max(1000000).optional(),
  salePrice: z.number().positive().max(1000000).nullable().optional(),
  categoryId: z.string().min(1).optional(),
  customCategory: z.string().max(80).nullable().optional(),
  stock: z.number().int().min(0).max(100000).optional(),
  sizes: z.string().min(1).max(100).optional(),
  colors: z.string().min(2).max(4000).optional(),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  bestSeller: z.boolean().optional(),
  active: z.boolean().optional(),
  images: z.array(z.object({ url: z.string().min(1).max(300), alt: z.string().max(150).optional() })).max(8).optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const d = parsed.data

  const existing = await db.product.findUnique({ where: { id }, include: { images: true } })
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const data: Record<string, unknown> = { ...d }
  delete data.images

  const product = await db.$transaction(async (tx) => {
    if (d.images) {
      await tx.productImage.deleteMany({ where: { productId: id } })
      if (d.images.length) {
        await tx.productImage.createMany({
          data: d.images.map((img, i) => ({ productId: id, url: img.url, alt: img.alt ?? existing.name, sortOrder: i })),
        })
      }
    }
    return tx.product.update({ where: { id }, data, include: { images: true } })
  })

  // audit notable changes
  const changes: string[] = []
  if (d.price !== undefined && d.price !== existing.price) changes.push(`price ${existing.price}→${d.price}`)
  if (d.stock !== undefined && d.stock !== existing.stock) changes.push(`stock ${existing.stock}→${d.stock}`)
  if (d.salePrice !== undefined && d.salePrice !== existing.salePrice) changes.push('sale price')
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      adminName: admin.name,
      action: changes.length ? 'PRODUCT_UPDATED' : 'PRODUCT_EDITED',
      details: `Updated ${existing.name}${changes.length ? ` (${changes.join(', ')})` : ''}`,
    },
  })
  return NextResponse.json({ product })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const orderItems = await db.orderItem.count({ where: { productId: id } })
  if (orderItems > 0) {
    // keep order history intact — deactivate instead of hard delete
    await db.product.update({ where: { id }, data: { active: false } })
    await db.auditLog.create({
      data: { adminId: admin.id, adminName: admin.name, action: 'PRODUCT_ARCHIVED', details: `${existing.name} has order history — deactivated instead of deleted` },
    })
    return NextResponse.json({ ok: true, archived: true })
  }
  await db.product.delete({ where: { id } })
  await db.auditLog.create({
    data: { adminId: admin.id, adminName: admin.name, action: 'PRODUCT_DELETED', details: `Deleted product ${existing.name} (${existing.sku})` },
  })
  return NextResponse.json({ ok: true })
}
