'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Eye, Plus } from 'lucide-react'
import { useCart, useWishlist } from '@/lib/store'
import { useLang } from '@/lib/i18n'
import { formatPrice, discountPercent, parseColors } from '@/lib/shared'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { QuickView } from './quick-view'
import { RatingStars } from './rating-stars'
import { MediaBox, MediaFallback } from './media-box'
import type { ProductCardData } from '@/lib/queries'

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const [quickOpen, setQuickOpen] = useState(false)
  const { t } = useLang()
  const cart = useCart()
  const wishlist = useWishlist()
  const colors = parseColors(product.colors)
  const sizes = product.sizes.split(',').map((s) => s.trim()).filter(Boolean)
  const img = product.images[0]?.url ?? null
  const img2 = product.images[1]?.url ?? null
  const sale = product.salePrice && product.salePrice < product.price ? product.salePrice : null
  const off = discountPercent(product.price, product.salePrice)
  const soldOut = product.stock <= 0
  const lowStock = !soldOut && product.stock <= 3
  const favorited = wishlist.has(product.id)

  function addToCart() {
    const res = cart.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: img,
      price: sale ?? product.price,
      qty: 1,
      size: sizes[0] ?? 'M',
      color: colors[0]?.name ?? 'Default',
      maxStock: product.stock,
    })
    if (res.ok) {
      toast.success(t('card.addedToBag', { name: product.name }), { description: `${sizes[0] ?? 'M'} · ${colors[0]?.name ?? 'Default'}` })
      cart.open()
    } else {
      toast.error(res.error)
    }
  }

  function toggleWish() {
    const now = wishlist.toggle({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: img,
      price: product.price,
      salePrice: product.salePrice,
    })
    toast[now ? 'success' : 'info'](now ? t('card.savedToWishlist') : t('card.removedFromWishlist'), {
      description: product.name,
    })
  }

  return (
    <div className="group relative">
      <div className="relative overflow-hidden rounded-xl bg-secondary">
        <Link href={`/product/${product.slug}`} aria-label={product.name} className="block aspect-[3/4]">
          {img ? (
            <>
              <MediaBox
                src={img}
                alt={product.images[0]?.alt ?? product.name}
                priority={priority}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                hoverPlay
                className={cn('img-zoom object-cover', img2 ? 'group-hover:opacity-0' : '')}
              />
              {img2 ? (
                <MediaBox
                  src={img2}
                  alt={`${product.name} alternate view`}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              ) : null}
            </>
          ) : (
            <MediaFallback />
          )}
        </Link>

        {/* badges */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {off ? (
            <span className="rounded-full bg-flame px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">-{off}%</span>
          ) : null}
          {product.isNew ? (
            <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">{t('card.new')}</span>
          ) : null}
          {product.bestSeller ? (
            <span className="rounded-full bg-[#b8a038] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{t('card.bestSeller')}</span>
          ) : null}
          {soldOut ? (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background">{t('card.soldOut')}</span>
          ) : null}
        </div>

        {/* wishlist */}
        <button
          onClick={toggleWish}
          aria-label={favorited ? 'Remove from wishlist' : 'Add to wishlist'}
          className={cn(
            'absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-[9999px] bg-white/90 shadow-sm backdrop-blur transition-all hover:scale-110',
            favorited ? 'text-sale' : 'text-foreground/70'
          )}
        >
          <Heart className={cn('h-4 w-4', favorited && 'fill-current')} />
        </button>

        {/* hover actions (desktop) */}
        <div className="absolute inset-x-2.5 bottom-2.5 hidden gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100 md:flex">
          <button
            onClick={addToCart}
            disabled={soldOut}
            className="flex-1 rounded-full bg-ink py-2.5 text-[11px] font-bold uppercase tracking-wider text-cream transition-colors hover:bg-flame disabled:cursor-not-allowed disabled:opacity-40"
          >
            {soldOut ? t('card.soldOut') : t('card.addToBag')}
          </button>
          <button
            onClick={() => setQuickOpen(true)}
            aria-label="Quick view"
            className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-white/95 shadow-sm backdrop-blur transition-colors hover:bg-secondary"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* info */}
      <div className="px-0.5 pt-3">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/product/${product.slug}`} className="text-sm font-bold leading-snug hover:underline line-clamp-1">
            {product.name}
          </Link>
          <button onClick={() => setQuickOpen(true)} aria-label="Quick view" className="shrink-0 md:hidden">
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{product.category?.name}</p>
        <RatingStars reviews={product.reviews} className="mt-1" />
        <div className="mt-1.5 flex items-center gap-2">
          <span className={cn('text-sm font-bold', sale && 'text-sale')}>{formatPrice(sale ?? product.price)}</span>
          {sale ? <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span> : null}
          {lowStock ? <span className="ml-auto text-[11px] font-bold text-sale">{t('card.onlyLeft', { n: product.stock })}</span> : null}
        </div>
        {colors.length ? (
          <div className="mt-2 flex items-center gap-1.5">
            {colors.slice(0, 5).map((c) => (
              <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-[9999px] border border-border" style={{ background: c.hex }} />
            ))}
            {sizes.length ? <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">{sizes.join(' · ')}</span> : null}
          </div>
        ) : null}
        {/* mobile add to bag */}
        <button
          onClick={addToCart}
          disabled={soldOut}
          className="mt-2.5 w-full rounded-full border border-ink py-2 text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 md:hidden"
        >
          {soldOut ? t('card.soldOut') : t('card.addToBag')}
        </button>
      </div>

      <QuickView slug={product.slug} open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  )
}
