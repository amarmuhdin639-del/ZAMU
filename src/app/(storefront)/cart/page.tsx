'use client'

import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react'
import { useCart } from '@/lib/store'
import { MediaBox } from '@/components/store/media-box'
import { formatPrice } from '@/lib/shared'
import { Button } from '@/components/ui/button'

export default function CartPage() {
  const { items, updateQty, remove, subtotal } = useCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <ShoppingBag className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="mt-5 font-display text-3xl uppercase">Your bag is empty</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          You haven’t added anything yet. Fresh jerseys, baggy pants and heavyweight hoodies are waiting.
        </p>
        <Link href="/shop">
          <Button className="mt-6 rounded-full bg-ink px-8 py-6 text-xs uppercase tracking-wider hover:bg-flame">
            Start Shopping <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl uppercase tracking-tight">Your Bag</h1>
      <p className="mt-1 text-sm text-muted-foreground">{items.reduce((n, i) => n + i.qty, 0)} item(s) — saved on this device</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li key={item.key} className="flex gap-4 py-5">
              <Link href={`/product/${item.slug}`} className="relative h-28 w-[84px] shrink-0 overflow-hidden rounded-xl bg-secondary sm:h-32 sm:w-24">
                {item.image ? <MediaBox src={item.image} alt={item.name} sizes="96px" className="object-cover" /> : null}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/product/${item.slug}`} className="font-bold leading-snug hover:underline">
                      {item.name}
                    </Link>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      Size {item.size} · {item.color}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{formatPrice(item.price)}</p>
                  </div>
                  <button
                    onClick={() => remove(item.key)}
                    className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-full border border-border">
                    <button onClick={() => updateQty(item.key, item.qty - 1)} className="flex h-8 w-8 items-center justify-center" aria-label="Decrease">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.key, item.qty + 1)}
                      disabled={item.maxStock > 0 && item.qty >= item.maxStock}
                      className="flex h-8 w-8 items-center justify-center disabled:opacity-30"
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-bold">{formatPrice(item.price * item.qty)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg uppercase">Order Summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-bold">{formatPrice(subtotal())}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery fee</dt>
                <dd className="text-muted-foreground">Calculated at checkout</dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex justify-between">
                <span className="font-display text-base uppercase">Estimated total</span>
                <span className="font-bold">{formatPrice(subtotal())}</span>
              </div>
            </div>
            <Link href="/checkout" className="mt-5 block">
              <Button className="w-full rounded-full bg-flame py-6 text-xs font-bold uppercase tracking-[0.14em] hover:bg-flame-dark">
                Proceed to Checkout <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/shop" className="mt-3 block">
              <Button variant="outline" className="w-full rounded-full py-6 text-xs font-bold uppercase tracking-[0.14em]">
                <ArrowLeft className="mr-1 h-4 w-4" /> Continue Shopping
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
