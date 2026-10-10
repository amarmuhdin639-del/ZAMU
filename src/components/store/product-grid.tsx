import Link from 'next/link'
import { SearchX, PackageOpen } from 'lucide-react'
import { ProductCard } from './product-card'
import { Button } from '@/components/ui/button'
import type { ProductCardData } from '@/lib/queries'

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  )
}

export function ShopEmptyState({ query, onSale }: { query?: string; onSale?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        {query ? <SearchX className="h-6 w-6 text-muted-foreground" /> : <PackageOpen className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="mt-4 font-display text-xl uppercase">{query ? `Nothing for “${query}”` : 'No products match your filters'}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {query
          ? 'Try a different name, category or keyword — or browse the full collection instead.'
          : onSale
            ? 'No items are on sale right now. New drops land all the time — check back soon.'
            : 'Try removing a filter or two, or check back soon — new pieces drop regularly.'}
      </p>
      <Link href="/shop">
        <Button className="mt-5 rounded-full bg-ink px-7 text-xs uppercase tracking-wider hover:bg-flame">Browse everything</Button>
      </Link>
    </div>
  )
}

export function Pagination({ page, pages, makeHref }: { page: number; pages: number; makeHref: (p: number) => string }) {
  if (pages <= 1) return null
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1
  )
  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 ? (
        <Link href={makeHref(page - 1)} className="rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:border-ink">
          Prev
        </Link>
      ) : null}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link
            href={makeHref(n)}
            aria-current={n === page ? 'page' : undefined}
            className={n === page ? 'rounded-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-cream' : 'rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:border-ink'}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={makeHref(page + 1)} className="rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:border-ink">
          Next
        </Link>
      ) : null}
    </nav>
  )
}
