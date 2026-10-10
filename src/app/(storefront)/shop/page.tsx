import type { Metadata } from 'next'
import { Suspense } from 'react'
import { db } from '@/lib/db'
import { listProducts } from '@/lib/queries'
import { ShopSidebar, ShopToolbar } from '@/components/store/shop-controls'
import { ProductGrid, ShopEmptyState, Pagination } from '@/components/store/product-grid'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Shop All — Jerseys, Baggy Pants & Streetwear',
  description: 'Browse the full ZAMU collection: football jerseys, baggy pants, oversized tees, hoodies, tracksuits and more.',
}

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const get = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined)
  const page = Number(get('page') ?? '1') || 1

  const [categories, result] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    listProducts({
      q: get('q'),
      minPrice: get('minPrice') ? Number(get('minPrice')) : undefined,
      maxPrice: get('maxPrice') ? Number(get('maxPrice')) : undefined,
      size: get('size'),
      color: get('color'),
      available: get('available') === '1',
      onSale: get('onSale') === '1',
      isNew: get('isNew') === '1',
      bestSeller: get('bestSeller') === '1',
      featured: get('featured') === '1',
      sort: get('sort'),
      page,
      perPage: 12,
    }),
  ])

  const title = get('q')
    ? `Search: “${get('q')}”`
    : get('isNew')
      ? 'New Arrivals'
      : get('onSale')
        ? 'On Sale'
        : get('featured')
          ? 'Featured'
          : 'Shop All'

  const makeHref = (p: number) => {
    const usp = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === 'string' && k !== 'page') usp.set(k, v)
    }
    usp.set('page', String(p))
    return `/shop?${usp.toString()}`
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">The collection</p>
        <h1 className="mt-1 font-display text-4xl uppercase tracking-tight sm:text-5xl">{title}</h1>
      </header>

      <div className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-10">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <ShopSidebar categories={categories} total={result.total} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<Skeleton className="h-10 w-full" />}>
            <ShopToolbar total={result.total} />
          </Suspense>
          {result.items.length ? (
            <>
              <ProductGrid products={result.items} />
              <Pagination page={result.page} pages={result.pages} makeHref={makeHref} />
            </>
          ) : (
            <ShopEmptyState query={get('q')} onSale={get('onSale') === '1'} />
          )}
        </div>
      </div>
    </div>
  )
}
