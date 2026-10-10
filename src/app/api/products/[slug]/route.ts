import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getProductBySlug } from '@/lib/queries'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const product = await getProductBySlug(slug)
    if (!product || !product.active) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    // fire & forget view counter
    db.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})
    // related products from same category
    const related = await db.product.findMany({
      where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
      take: 4,
      orderBy: [{ bestSeller: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true, name: true, slug: true, price: true, salePrice: true, stock: true, sizes: true, colors: true,
        isNew: true, bestSeller: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 2, select: { url: true } },
        reviews: { where: { approved: true }, select: { rating: true } },
      },
    })
    return NextResponse.json({ product, related })
  } catch (e) {
    console.error('product detail error', e)
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 })
  }
}
