import { NextRequest, NextResponse } from 'next/server'
import { listProducts } from '@/lib/queries'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const num = (k: string) => (sp.get(k) !== null && sp.get(k) !== '' ? Number(sp.get(k)) : undefined)
    const result = await listProducts({
      q: sp.get('q') ?? undefined,
      category: sp.get('category') ?? undefined,
      minPrice: num('minPrice'),
      maxPrice: num('maxPrice'),
      size: sp.get('size') ?? undefined,
      color: sp.get('color') ?? undefined,
      available: sp.get('available') === '1',
      onSale: sp.get('onSale') === '1',
      isNew: sp.get('isNew') === '1',
      bestSeller: sp.get('bestSeller') === '1',
      featured: sp.get('featured') === '1',
      slugs: sp.get('slugs') ? sp.get('slugs')!.split(',').filter(Boolean) : undefined,
      sort: sp.get('sort') ?? undefined,
      page: num('page'),
      perPage: num('perPage'),
    })
    return NextResponse.json(result)
  } catch (e) {
    console.error('products list error', e)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}
