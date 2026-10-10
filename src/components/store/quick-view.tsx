'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart } from '@/lib/store'
import { formatPrice, discountPercent, parseColors, parseSizes } from '@/lib/shared'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { RatingStars } from './rating-stars'
import { MediaBox } from './media-box'
type Detail = {
  id: string
  name: string
  slug: string
  price: number
  salePrice: number | null
  stock: number
  sizes: string
  colors: string
  description: string
  sku: string
  customCategory?: string | null
  category: { name: string }
  images: { url: string; alt: string | null }[]
  reviews?: { rating: number }[]
}

export function QuickView({ slug, open, onClose }: { slug: string; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto thin-scrollbar p-0 sm:max-w-2xl">
        {open ? <QuickViewContent slug={slug} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function QuickViewContent({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null)
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [qty, setQty] = useState(1)
  const cart = useCart()

  useEffect(() => {
    let alive = true
    fetch(`/api/products/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setData(d.product)
        const sizes = parseSizes(d.product?.sizes ?? '')
        const colors = parseColors(d.product?.colors ?? '')
        setSize(sizes[0] ?? '')
        setColor(colors[0]?.name ?? '')
      })
      .catch(() => toast.error('Could not load product'))
    return () => {
      alive = false
    }
  }, [slug])

  function add() {
    if (!data) return
    if (!size) return toast.error('Please select a size')
    const res = cart.add({
      productId: data.id,
      slug: data.slug,
      name: data.name,
      image: data.images[0]?.url ?? null,
      price: data.salePrice && data.salePrice < data.price ? data.salePrice : data.price,
      qty,
      size,
      color: color || 'Default',
      maxStock: data.stock,
    })
    if (res.ok) {
      toast.success(`${data.name} added to your bag`)
      onClose()
      cart.open()
    } else {
      toast.error(res.error)
    }
  }

  const sale = data?.salePrice && data.salePrice < data.price ? data.salePrice : null
  const off = data ? discountPercent(data.price, data.salePrice) : null
  // when the selected color has its own photo, show that photo first
  const colorImage = data ? parseColors(data.colors).find((c) => c.name === color)?.image : undefined
  const mainImage = colorImage ?? data?.images[0]?.url

  return (
    <>
        {!data ? (
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <Skeleton className="aspect-[3/4] rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full rounded-full" />
            </div>
          </div>
        ) : (
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="relative aspect-[3/4] bg-secondary sm:rounded-l-xl overflow-hidden">
              {mainImage ? (
                <MediaBox src={mainImage} alt={data.images[0]?.alt ?? data.name} sizes="(max-width: 640px) 100vw, 360px" className="object-cover" />
              ) : null}
              {off ? (
                <span className="absolute left-3 top-3 rounded-full bg-flame px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">-{off}%</span>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 p-5 sm:p-6">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{data.customCategory || data.category?.name}</p>
                <h3 className="font-display text-xl uppercase leading-tight">{data.name}</h3>
                <RatingStars reviews={data.reviews} className="mt-1" />
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-lg font-bold', sale && 'text-sale')}>{formatPrice(sale ?? data.price)}</span>
                {sale ? <span className="text-sm text-muted-foreground line-through">{formatPrice(data.price)}</span> : null}
              </div>
              {data.stock <= 0 ? (
                <p className="text-sm font-bold uppercase text-destructive">Sold out</p>
              ) : data.stock <= 3 ? (
                <p className="text-xs font-bold uppercase tracking-wide text-sale">Only {data.stock} left</p>
              ) : null}

              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Size</p>
                <div className="flex flex-wrap gap-1.5">
                  {parseSizes(data.sizes).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={cn(
                        'h-8 min-w-9 rounded-md border px-2 text-xs font-bold transition-colors',
                        size === s ? 'border-ink bg-ink text-cream' : 'border-border hover:border-ink'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Color · {color}</p>
                <div className="flex gap-2">
                  {parseColors(data.colors).map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c.name)}
                      title={c.name}
                      aria-label={c.name}
                      className={cn('h-7 w-7 rounded-full border-2 transition-transform', color === c.name ? 'border-ink scale-110' : 'border-border')}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-full border border-border">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-9 w-9 items-center justify-center" aria-label="Decrease quantity">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(qty + 1, data.stock))}
                    disabled={qty >= data.stock}
                    className="flex h-9 w-9 items-center justify-center disabled:opacity-30"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={add}
                  disabled={data.stock <= 0}
                  className="flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-flame text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-flame-dark disabled:opacity-40"
                >
                  <ShoppingBag className="h-4 w-4" /> Add to Bag
                </button>
              </div>

              <Link href={`/product/${data.slug}`} className="mt-1 text-xs font-bold uppercase tracking-wider underline underline-offset-4 hover:text-flame">
                View full details →
              </Link>
            </div>
          </div>
        )}
    </>
  )
}
