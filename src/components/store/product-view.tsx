'use client'

import { useEffect, useMemo, useState } from 'react'
import { MediaBox, SafeImage } from './media-box'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Minus, Plus, ShoppingBag, ShieldCheck, Truck, ChevronDown, Star } from 'lucide-react'
import { useCart, useWishlist, pushRecent } from '@/lib/store'
import { useLang } from '@/lib/i18n'
import { formatPrice, discountPercent, parseColors, formatDate } from '@/lib/shared'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SizeGuideTable } from './size-guide-table'
import { isVideoUrl } from '@/lib/media'

export type ProductDetail = {
  id: string
  name: string
  slug: string
  sku: string
  description: string
  price: number
  salePrice: number | null
  stock: number
  sizes: string
  colors: string
  featured: boolean
  isNew: boolean
  bestSeller: boolean
  createdAt: string | Date
  category: { name: string; slug: string }
  customCategory: string | null
  images: { url: string; alt: string | null }[]
  reviews: { id: string; name: string; rating: number; comment: string; verified: boolean; createdAt: string | Date; user?: { name: string } | null }[]
}

export function ProductView({ product, deliveryNote }: { product: ProductDetail; deliveryNote: string }) {
  const router = useRouter()
  const { t } = useLang()
  const cart = useCart()
  const wishlist = useWishlist()
  const sizes = useMemo(() => product.sizes.split(',').map((s) => s.trim()).filter(Boolean), [product.sizes])
  const colors = useMemo(() => parseColors(product.colors), [product.colors])
  const [size, setSize] = useState(sizes[0] ?? '')
  const [color, setColor] = useState(colors[0]?.name ?? '')
  const [qty, setQty] = useState(1)
  const [activeUrl, setActiveUrl] = useState(product.images[0]?.url ?? '')
  const [zoom, setZoom] = useState(false)

  const sale = product.salePrice && product.salePrice < product.price ? product.salePrice : null
  const off = discountPercent(product.price, product.salePrice)
  const soldOut = product.stock <= 0
  const lowStock = !soldOut && product.stock <= 3
  const favorited = wishlist.has(product.id)
  const avg = product.reviews.length ? product.reviews.reduce((n, r) => n + r.rating, 0) / product.reviews.length : 0
  const typeLabel = product.customCategory || product.category.name

  // gallery: if the selected color has its own photo, make sure it's visible (prepend when the owner linked a photo that's not part of the main gallery)
  const colorImage = colors.find((c) => c.name === color)?.image
  const gallery = useMemo(() => {
    if (!colorImage) return product.images
    return product.images.some((i) => i.url === colorImage)
      ? product.images
      : [{ url: colorImage, alt: `${product.name} · ${color}` }, ...product.images]
  }, [product.images, colorImage, color, product.name])
  const activeIdx = Math.max(0, gallery.findIndex((g) => g.url === activeUrl))

  useEffect(() => {
    pushRecent({
      slug: product.slug,
      name: product.name,
      image: product.images[0]?.url ?? null,
      price: product.price,
      salePrice: product.salePrice,
    })
  }, [product])

  function addToCart(openDrawer = true) {
    if (!size) {
      toast.error(t('product.selectSize'))
      return false
    }
    const res = cart.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0]?.url ?? null,
      price: sale ?? product.price,
      qty,
      size,
      color: color || 'Default',
      maxStock: product.stock,
    })
    if (res.ok) {
      toast.success(t('card.addedToBag', { name: product.name }))
      if (openDrawer) cart.open()
      return true
    }
    toast.error(res.error)
    return false
  }

  function buyNow() {
    if (addToCart(false)) router.push('/checkout')
  }

  function toggleWish() {
    const now = wishlist.toggle({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0]?.url ?? null,
      price: product.price,
      salePrice: product.salePrice,
    })
    toast[now ? 'success' : 'info'](now ? t('card.savedToWishlist') : t('card.removedFromWishlist'))
  }

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-5 text-xs uppercase tracking-wider text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">Shop</Link> <span className="mx-1">/</span>
        <Link href={`/shop/${product.category.slug}`} className="hover:text-foreground">{typeLabel}</Link> <span className="mx-1">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* gallery */}
        <div>
          <div
            className="relative aspect-[3/4] cursor-zoom-in overflow-hidden rounded-2xl bg-secondary"
            onClick={() => setZoom(true)}
          >
            {gallery[0] ? (
              <MediaBox
                src={gallery[activeIdx]?.url ?? gallery[0].url}
                alt={gallery[activeIdx]?.alt ?? product.name}
                priority
                autoPlay
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
            )}
            {off ? (
              <span className="absolute left-3 top-3 rounded-full bg-flame px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">-{off}% off</span>
            ) : null}
          </div>
          {gallery.length > 1 ? (
            <div className="mt-3 flex gap-2.5">
              {gallery.map((img, i) => (
                <button
                  key={img.url}
                  onClick={() => setActiveUrl(img.url)}
                  aria-label={`View image ${i + 1}`}
                  className={cn(
                    'relative h-20 w-16 overflow-hidden rounded-lg border-2 transition-colors',
                    activeIdx === i ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'
                  )}
                >
                  <MediaBox src={img.url} alt={img.alt ?? ''} sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Link href={`/shop/${product.category.slug}`} className="text-[11px] font-bold uppercase tracking-[0.16em] text-flame hover:underline">
              {typeLabel}
            </Link>
            {product.isNew && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">{t('card.new')}</span>}
            {product.bestSeller && <span className="rounded-full bg-[#b8a038] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{t('card.bestSeller')}</span>}
          </div>
          <h1 className="mt-2 font-display text-3xl uppercase leading-[1.05] tracking-tight sm:text-4xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={cn('text-2xl font-bold', sale && 'text-sale')}>{formatPrice(sale ?? product.price)}</span>
            {sale ? <span className="text-lg text-muted-foreground line-through">{formatPrice(product.price)}</span> : null}
            {product.reviews.length > 0 && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-[#b8a038] text-[#b8a038]" />
                {avg.toFixed(1)} <span className="text-xs">({t('product.reviewsCount', { n: product.reviews.length })})</span>
              </span>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          {/* size */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {t('product.size')} {size && <span className="text-foreground">· {size}</span>}
            </p>
            <Dialog>
              <DialogTrigger className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider underline underline-offset-4 hover:text-flame">
                {t('product.sizeGuide')} <ChevronDown className="h-3 w-3" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-display uppercase">{t('product.sizeGuideTitle')}</DialogTitle>
                </DialogHeader>
                <SizeGuideTable />
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={cn(
                  'h-10 min-w-11 rounded-lg border px-3 text-sm font-bold transition-colors',
                  size === s ? 'border-ink bg-ink text-cream' : 'border-border bg-card hover:border-ink'
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* color */}
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {t('product.color')} {color && <span className="text-foreground">· {color}</span>}
            </p>
            <div className="mt-2 flex gap-2.5">
              {colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    setColor(c.name)
                    if (c.image) setActiveUrl(c.image)
                  }}
                  aria-label={c.name}
                  title={c.image ? `${c.name} · ${c.image}` : c.name}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105',
                    color === c.name ? 'border-ink scale-105' : 'border-border'
                  )}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* stock */}
          <div className="mt-5 text-sm">
            {soldOut ? (
              <p className="font-bold uppercase tracking-wide text-destructive">{t('product.soldOut')}</p>
            ) : lowStock ? (
              <p className="font-bold uppercase tracking-wide text-sale">{t('card.onlyLeft', { n: product.stock })} — {t('product.buyNow')}</p>
            ) : (
              <p className="text-muted-foreground">{t('product.inStock')}</p>
            )}
          </div>

          {/* qty + actions */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-11 w-11 items-center justify-center" aria-label="Decrease quantity">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button
                onClick={() => setQty(Math.min(qty + 1, product.stock || 1))}
                disabled={product.stock > 0 && qty >= product.stock}
                className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={toggleWish}
              aria-label="Add to wishlist"
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full border transition-colors',
                favorited ? 'border-sale text-sale' : 'border-border hover:border-ink'
              )}
            >
              <Heart className={cn('h-5 w-5', favorited && 'fill-current')} />
            </button>
          </div>

          <div className="mt-4 hidden gap-3 md:flex">
            <button
              onClick={() => addToCart()}
              disabled={soldOut}
              className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-ink py-4 text-xs font-bold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-flame disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag className="h-4 w-4" /> {t('product.addToCart')} — {formatPrice((sale ?? product.price) * qty)}
            </button>
            <button
              onClick={buyNow}
              disabled={soldOut}
              className="flex-1 rounded-full border-2 border-ink py-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors hover:bg-ink hover:text-cream disabled:opacity-40"
            >
              {t('product.buyNow')}
            </button>
          </div>

          {/* trust */}
          <div className="mt-6 grid gap-3 rounded-xl bg-secondary/70 p-4 text-sm">
            <p className="flex items-center gap-2.5 text-muted-foreground"><Truck className="h-4 w-4 text-flame" /> {deliveryNote}</p>
            <p className="flex items-center gap-2.5 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-flame" /> {t('product.trustPayment')}</p>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">SKU: {product.sku}</p>
        </div>
      </div>

      {/* sticky add to cart (mobile) */}
      <div
        className="fixed inset-x-0 bottom-[64px] z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {soldOut ? (
          <div className="rounded-full bg-secondary py-3.5 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('product.soldOut')}</div>
        ) : (
          <button
            onClick={() => addToCart()}
            className="w-full rounded-full bg-flame py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white active:scale-[0.99]"
          >
            {t('product.addToCart')} — {formatPrice((sale ?? product.price) * qty)}
          </button>
        )}
      </div>

      {/* image zoom dialog */}
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-h-[92vh] overflow-y-auto thin-scrollbar p-0 sm:max-w-3xl">
          <div className="relative aspect-[3/4] w-full bg-secondary">
            {isVideoUrl(gallery[activeIdx]?.url) ? (
              <video
                src={gallery[activeIdx]?.url}
                aria-label={product.name}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <SafeImage src={gallery[activeIdx]?.url ?? ''} alt={product.name} fill sizes="90vw" className="object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* reviews */}
      <section className="mt-16 border-t border-border pt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl uppercase tracking-tight">{t('product.reviews')} ({product.reviews.length})</h2>
          {product.reviews.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="h-5 w-5 fill-[#b8a038] text-[#b8a038]" />
              <span className="font-display text-xl">{avg.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
          )}
        </div>
        <ReviewsSection productId={product.id} reviews={product.reviews} />
      </section>
    </div>
  )
}

import { ReviewsSection } from './reviews-section'
