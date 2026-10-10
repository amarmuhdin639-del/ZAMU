'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MediaBox } from './media-box'
import { Heart, Trash2 } from 'lucide-react'
import { useWishlist } from '@/lib/store'
import { useLang } from '@/lib/i18n'
import { formatPrice } from '@/lib/shared'
import { useMounted } from '@/hooks/use-mounted'
import { Button } from '@/components/ui/button'

export function WishlistClient() {
  const wishlist = useWishlist()
  const mounted = useMounted()
  const { t } = useLang()

  if (!mounted) {
    return <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton aspect-[3/4] rounded-xl" />)}</div>
  }

  if (wishlist.items.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <Heart className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 font-display text-2xl uppercase">{t('wishlist.empty')}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t('wishlist.emptyText')}
        </p>
        <Link href="/shop"><Button className="mt-5 rounded-full bg-ink px-8 text-xs uppercase tracking-wider hover:bg-flame">{t('wishlist.browse')}</Button></Link>
      </div>
    )
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {wishlist.items.map((item) => {
        const price = item.salePrice && item.salePrice < item.price ? item.salePrice : item.price
        return (
          <div key={item.productId} className="group">
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-secondary">
              <Link href={`/product/${item.slug}`}>
                {item.image ? <MediaBox src={item.image} alt={item.name} sizes="(max-width: 640px) 50vw, 25vw" className="img-zoom object-cover" /> : null}
              </Link>
              <button
                onClick={() => wishlist.remove(item.productId)}
                aria-label="Remove from wishlist"
                className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-destructive shadow-sm backdrop-blur transition-transform hover:scale-110"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <Link href={`/product/${item.slug}`} className="mt-2.5 block text-sm font-bold hover:underline">{item.name}</Link>
            <p className="mt-1 text-sm font-bold">{formatPrice(price)}</p>
          </div>
        )
      })}
    </div>
  )
}
