import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

// GET: user's favorites (server-side source when logged in)
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ favorites: [] })
  const favorites = await db.favorite.findMany({
    where: { userId: user.id },
    include: {
      product: {
        select: { id: true, slug: true, name: true, price: true, salePrice: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } } },
      },
    },
  })
  return NextResponse.json({
    favorites: favorites.map((f) => ({
      productId: f.product.id,
      slug: f.product.slug,
      name: f.product.name,
      price: f.product.price,
      salePrice: f.product.salePrice,
      image: f.product.images[0]?.url ?? null,
    })),
  })
}

// POST: toggle favorite
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Sign in to sync your wishlist' }, { status: 401 })
  const body = await req.json()
  const productId = String(body?.productId ?? '')
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })
  const existing = await db.favorite.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  })
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } })
    return NextResponse.json({ favorited: false })
  }
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  await db.favorite.create({ data: { userId: user.id, productId } })
  return NextResponse.json({ favorited: true })
}
