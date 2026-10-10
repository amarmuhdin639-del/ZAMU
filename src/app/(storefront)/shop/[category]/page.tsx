import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { listProducts } from '@/lib/queries'
import { ShopSidebar, ShopToolbar } from '@/components/store/shop-controls'
import { ProductGrid, ShopEmptyState, Pagination } from '@/components/store/product-grid'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ category: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const cat = await db.category.findUnique({ where: { slug: category } })
  if (!cat) return { title: 'Category' }
  return {
    title: `${cat.name} — Jerseys, Streetwear & More`,
    description: cat.description ?? `Shop ${cat.name} at ZAMU — family-owned streetwear from Addis Ababa.`,
    openGraph: { title: `${cat.name} · ZAMU`, images: cat.image ? [cat.image] : undefined },
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params
  const sp = await searchParams
  const get = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined)
  const page = Number(get('page') ?? '1') || 1

  const cat = await db.category.findUnique({ where: { slug: category } })
  if (!cat || !cat.active) notFound()

  const [categories, result] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    listProducts({
      category,
      sort: get('sort'),
      page,
      perPage: 12,
      minPrice: get('minPrice') ? Number(get('minPrice')) : undefined,
      maxPrice: get('maxPrice') ? Number(get('maxPrice')) : undefined,
      size: get('size'),
      color: get('color'),
      available: get('available') === '1',
      onSale: get('onSale') === '1',
    }),
  ])

  const makeHref = (p: number) => {
    const usp = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === 'string' && k !== 'page') usp.set(k, v)
    }
    usp.set('page', String(p))
    return `/shop/${category}?${usp.toString()}`
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <nav aria-label="Breadcrumb" className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          <a href="/shop" className="hover:text-foreground">Shop</a> <span className="mx-1">/</span> <span className="text-foreground">{cat.name}</span>
        </nav>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">Category</p>
        <h1 className="mt-1 font-display text-4xl uppercase tracking-tight sm:text-5xl">{cat.name}</h1>
        {cat.description ? <p className="mt-2 max-w-xl text-sm text-muted-foreground">{cat.description}</p> : null}
      </header>

      <div className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-10">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <ShopSidebar categories={categories} activeCategory={cat.slug} total={result.total} />
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
            <ShopEmptyState />
          )}
        </div>
      </div>
    </div>
  )
}
