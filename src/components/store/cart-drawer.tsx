'use client'

import Link from 'next/link'
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from '@/lib/store'
import { MediaBox } from './media-box'
import { useLang } from '@/lib/i18n'
import { formatPrice } from '@/lib/shared'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export function CartDrawer() {
  const { items, isOpen, close, updateQty, remove, subtotal } = useCart()
  const { t } = useLang()

  return (
    <Sheet open={isOpen} onOpenChange={(v) => (v ? undefined : close())}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="font-display text-lg uppercase tracking-wide flex items-center gap-2">
            {t('cart.title')}
            <span className="text-xs font-sans font-bold text-muted-foreground">
              ({items.reduce((n, i) => n + i.qty, 0)})
            </span>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-display text-xl uppercase">{t('cart.empty')}</p>
            <p className="text-sm text-muted-foreground">{t('cart.emptyText')}</p>
            <Button onClick={close} className="mt-2 rounded-full bg-ink px-8 text-xs uppercase tracking-wider hover:bg-flame">
              {t('cart.continue')}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto thin-scrollbar px-5 py-4">
              <ul className="flex flex-col gap-4">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3">
                    <Link href={`/product/${item.slug}`} onClick={close} className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-lg bg-secondary">
                      {item.image ? (
                        <MediaBox src={item.image} alt={item.name} sizes="72px" className="object-cover" />
                      ) : null}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/product/${item.slug}`} onClick={close} className="truncate text-sm font-bold hover:underline">
                          {item.name}
                        </Link>
                        <button onClick={() => remove(item.key)} aria-label="Remove item" className="p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.size} · {item.color}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center rounded-full border border-border">
                          <button
                            onClick={() => updateQty(item.key, item.qty - 1)}
                            className="flex h-7 w-7 items-center justify-center"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.key, item.qty + 1)}
                            className="flex h-7 w-7 items-center justify-center disabled:opacity-30"
                            disabled={item.maxStock > 0 && item.qty >= item.maxStock}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold">{formatPrice(item.price * item.qty)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-border px-5 py-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                <span className="font-bold">{formatPrice(subtotal())}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{t('cart.deliveryNote')}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={close} className="flex-1 rounded-full text-xs uppercase tracking-wider">
                  {t('cart.continue')}
                </Button>
                <Link href="/checkout" onClick={close} className="flex-1">
                  <Button className="w-full rounded-full bg-flame text-xs uppercase tracking-wider hover:bg-flame-dark">
                    {t('cart.checkout')}
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
