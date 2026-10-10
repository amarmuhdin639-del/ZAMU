import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const schema = z.object({
  productId: z.string().min(1),
  name: z.string().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(4).max(1000),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid review' }, { status: 400 })
    }
    const { productId, name, rating, comment } = parsed.data
    const user = await getSessionUser()

    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // "Verified Purchase" only when signed-in user has a paid/verified or delivered order containing this product
    let verified = false
    if (user) {
      const count = await db.orderItem.count({
        where: {
          productId,
          order: {
            userId: user.id,
            OR: [{ paymentStatus: 'VERIFIED' }, { status: 'DELIVERED' }],
          },
        },
      })
      verified = count > 0
    }

    const review = await db.review.create({
      data: { productId, userId: user?.id ?? null, name, rating, comment, verified },
    })
    return NextResponse.json({ review })
  } catch (e) {
    console.error('review create error', e)
    return NextResponse.json({ error: 'Could not submit review' }, { status: 500 })
  }
}
