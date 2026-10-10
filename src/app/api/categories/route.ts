import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, name: true, slug: true, description: true, image: true,
        _count: { select: { products: { where: { active: true } } } },
      },
    })
    return NextResponse.json({ categories })
  } catch (e) {
    console.error('categories error', e)
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }
}
