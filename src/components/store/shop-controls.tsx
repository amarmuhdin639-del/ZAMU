'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { SlidersHorizontal, X, Check } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'
import type { Category } from '@prisma/client'

export type FilterCategory = Pick<Category, 'id' | 'name' | 'slug'>

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const COLOR_SWATCHES = [
  { name: 'Black', hex: '#141412' },
  { name: 'White', hex: '#f5f4ef' },
  { name: 'Red', hex: '#d42b1f' },
  { name: 'Green', hex: '#1f7a3d' },
  { name: 'Olive', hex: '#6b6b3a' },
  { name: 'Cream', hex: '#efe8d8' },
  { name: 'Navy', hex: '#1e2a44' },
  { name: 'Grey', hex: '#8e8c88' },
]

const FILTER_KEYS = ['size', 'color', 'minPrice', 'maxPrice', 'available', 'onSale', 'isNew', 'bestSeller']

function useFilterParams() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const params = useMemo(() => new URLSearchParams(sp.toString()), [sp])
  const update = useCallback(
    (key: string, value: string | null) => {
      const p = new URLSearchParams(params.toString())
      if (value === null || value === '') p.delete(key)
      else p.set(key, value)
      p.delete('page')
      router.push(`${pathname}?${p.toString()}`, { scroll: false })
    },
    [params, pathname, router]
  )
  return { params, update }
}

/** Desktop sidebar + mobile sheet button. Put inside the left grid column. */
export function ShopSidebar({ categories, activeCategory, total }: { categories: FilterCategory[]; activeCategory?: string; total: number }) {
  const { params, update } = useFilterParams()
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length

  const panel = <FilterPanel categories={categories} activeCategory={activeCategory} params={params} update={update} maxPrice={Number(params.get('maxPrice') ?? 3000)} />

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-full border border-border py-2.5 text-xs font-bold uppercase tracking-wider lg:hidden"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" /> {t('shop.filters')}{activeCount ? ` (${activeCount})` : ''}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[86%] max-w-sm overflow-y-auto thin-scrollbar p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="font-display text-lg uppercase">{t('shop.filters')}</SheetTitle>
          </SheetHeader>
          <div className="px-5 py-4">{panel}</div>
          <div className="sticky bottom-0 border-t border-border bg-background p-4">
            <Button onClick={() => setOpen(false)} className="w-full rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame">
              {t('shop.results', { n: total })}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <div className="hidden lg:block">{panel}</div>
    </>
  )
}

/** Result count + sort dropdown + mobile quick chips. Put above the product grid. */
export function ShopToolbar({ total }: { total: number }) {
  const { params, update } = useFilterParams()
  const { t } = useLang()
  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t('shop.results', { n: total })}
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-flame/10 px-2 py-0.5 text-[11px] font-bold text-flame">
              {activeCount} {t('shop.filters')}
            </span>
          )}
        </p>
        <select
          value={params.get('sort') ?? 'newest'}
          onChange={(e) => update('sort', e.target.value)}
          aria-label="Sort products"
          className="h-9 rounded-full border border-border bg-card px-3.5 text-xs font-semibold uppercase tracking-wider outline-none focus:border-ink"
        >
          <option value="newest">{t('shop.sortNewest')}</option>
          <option value="popular">{t('shop.sortPopular')}</option>
          <option value="featured">{t('shop.sortFeatured')}</option>
          <option value="price-asc">{t('shop.sortPriceAsc')}</option>
          <option value="price-desc">{t('shop.sortPriceDesc')}</option>
        </select>
      </div>
      <div className="no-scrollbar mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
        <Chip active={params.get('isNew') === '1'} onClick={() => update('isNew', params.get('isNew') ? null : '1')}>{t('card.new')}</Chip>
        <Chip active={params.get('onSale') === '1'} onClick={() => update('onSale', params.get('onSale') ? null : '1')}>{t('footer.sale')}</Chip>
        <Chip active={params.get('bestSeller') === '1'} onClick={() => update('bestSeller', params.get('bestSeller') ? null : '1')}>{t('home.bestSellers')}</Chip>
        <Chip active={params.get('available') === '1'} onClick={() => update('available', params.get('available') ? null : '1')}>{t('shop.inStockOnly')}</Chip>
        <Chip active={params.get('featured') === '1'} onClick={() => update('featured', params.get('featured') ? null : '1')}>{t('nav.featured')}</Chip>
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
        active ? 'border-ink bg-ink text-cream' : 'border-border bg-card'
      )}
    >
      {children}
    </button>
  )
}

function FilterPanel({
  categories,
  activeCategory,
  params,
  update,
  maxPrice,
}: {
  categories: FilterCategory[]
  activeCategory?: string
  params: URLSearchParams
  update: (key: string, value: string | null) => void
  maxPrice: number
}) {
  const activeSize = params.get('size')
  const activeColor = params.get('color')
  const { t } = useLang()
  const [price, setPrice] = useState(maxPrice)
  // adjust-during-render pattern: sync local slider when the URL param changes
  const [prevMax, setPrevMax] = useState(maxPrice)
  if (prevMax !== maxPrice) {
    setPrevMax(maxPrice)
    setPrice(maxPrice)
  }
  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length

  return (
    <div className="space-y-7">
      <div className="lg:hidden">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('common.search')}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const value = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value
            window.location.href = `/shop?q=${encodeURIComponent(value)}`
          }}
        >
          <input name="q" defaultValue={params.get('q') ?? ''} placeholder={t('nav.searchPlaceholder')} className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink" />
        </form>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('common.categories')}</p>
        <ul className="space-y-1.5">
          <li><CatLink href="/shop" active={!activeCategory} label={t('footer.allProducts')} /></li>
          {categories.map((c) => (
            <li key={c.id}><CatLink href={`/shop/${c.slug}`} active={activeCategory === c.slug} label={c.name} /></li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Max price · <span className="text-foreground">ETB {price.toLocaleString()}</span>
        </p>
        <Slider
          value={[price]}
          min={100}
          max={3000}
          step={100}
          onValueChange={([v]) => setPrice(v)}
          onValueCommit={([v]) => update('maxPrice', String(v))}
          className="w-full"
        />
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('shop.size')}</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => update('size', activeSize === s ? null : s)}
              className={cn(
                'h-8 min-w-9 rounded-md border px-2 text-xs font-bold transition-colors',
                activeSize === s ? 'border-ink bg-ink text-cream' : 'border-border hover:border-ink'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t('shop.color')}{activeColor ? ` · ${activeColor}` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c.name}
              onClick={() => update('color', activeColor === c.name ? null : c.name)}
              aria-label={c.name}
              title={c.name}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
                activeColor === c.name ? 'border-ink' : 'border-border'
              )}
              style={{ background: c.hex }}
            >
              {activeColor === c.name ? <Check className="h-3.5 w-3.5 text-white mix-blend-difference" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <Toggle label={t('shop.inStockOnly')} checked={params.get('available') === '1'} onChange={(v) => update('available', v ? '1' : null)} />
        <Toggle label={t('shop.onSaleOnly')} checked={params.get('onSale') === '1'} onChange={(v) => update('onSale', v ? '1' : null)} />
        <Toggle label={t('nav.newArrivals')} checked={params.get('isNew') === '1'} onChange={(v) => update('isNew', v ? '1' : null)} />
        <Toggle label={t('home.bestSellers')} checked={params.get('bestSeller') === '1'} onChange={(v) => update('bestSeller', v ? '1' : null)} />
      </div>

      {activeCount > 0 && (
        <ClearButton />
      )}
    </div>
  )
}

function ClearButton() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLang()
  return (
    <button
      onClick={() => {
        const p = new URLSearchParams(window.location.search)
        for (const k of FILTER_KEYS) p.delete(k)
        p.delete('page')
        router.push(`${pathname}${p.toString() ? `?${p}` : ''}`)
      }}
      className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-flame hover:underline"
    >
      <X className="h-3.5 w-3.5" /> {t('shop.clear')}
    </button>
  )
}

function CatLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => {
        const p = new URLSearchParams(window.location.search)
        for (const k of ['page', 'q', ...FILTER_KEYS, 'featured', 'sort']) p.delete(k)
        router.push(`${href}${p.toString() ? `?${p}` : ''}`)
      }}
      className={cn('flex w-full items-center justify-between py-0.5 text-sm transition-colors', active ? 'font-bold text-foreground' : 'text-muted-foreground hover:text-foreground')}
    >
      {label}
      {active ? <Check className="h-3.5 w-3.5 text-flame" /> : null}
    </button>
  )
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex w-full items-center justify-between text-sm" role="switch" aria-checked={checked}>
      <span className={checked ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
      <span className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-flame' : 'bg-border')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  )
}
