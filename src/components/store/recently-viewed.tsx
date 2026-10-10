'use client'

import { useEffect, useState } from 'react'
import { ProductCard } from './product-card'
import { getRecent } from '@/lib/store'
import { T } from '@/lib/i18n'
import type { ProductCardData } from '@/lib/queries'

export function RecentlyViewed() {
  const [products, setProducts] = useState<ProductCardData[] | null>(null)
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    // defer to a microtask so we never setState synchronously inside the effect
    let alive = true
    Promise.resolve().then(() => {
      if (!alive) return
      const recents = getRecent()
      if (!recents.length) {
        setEmpty(true)
        return
      }
      fetch(`/api/products?slugs=${recents.map((r) => r.slug).join(',')}&perPage=8`)
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return
          const order = recents.map((r) => r.slug)
          setProducts(
            (d.items ?? []).sort(
              (a: ProductCardData, b: ProductCardData) => order.indexOf(a.slug) - order.indexOf(b.slug)
            )
          )
        })
        .catch(() => setEmpty(true))
    })
    return () => {
      alive = false
    }
  }, [])

  if (empty || (products && products.length === 0)) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="mb-6 font-display text-2xl uppercase tracking-tight sm:text-3xl"><T k="home.recentlyViewed" /></h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {products
          ? products.map((p) => <ProductCard key={p.id} product={p} />)
          : Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4] rounded-xl" />)}
      </div>
    </section>
  )
}
