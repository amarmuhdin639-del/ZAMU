'use client'

import { useState } from 'react'
import { SafeImage } from './media-box'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/store'
import { useLang } from '@/lib/i18n'
import { formatPrice } from '@/lib/shared'
import { saveOrder } from '@/lib/saved-orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Tag, X } from 'lucide-react'
import type { DeliveryZone } from '@prisma/client'
import type { SafeUser } from '@/lib/auth'

type Props = {
  zones: DeliveryZone[]
  user: SafeUser | null
  deliveryNote: string
}

export function CheckoutForm({ zones, user, deliveryNote }: Props) {
  const router = useRouter()
  const { t } = useLang()
  const cart = useCart()
  const items = cart.items
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '')
  const [discount, setDiscount] = useState<{ code: string; discount: number } | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [checkingCode, setCheckingCode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    customerName: user?.name ?? '',
    phone: user?.phone ?? '',
    city: user?.city ?? '',
    address: user?.address ?? '',
    notes: '',
  })

  const zone = zones.find((z) => z.id === zoneId) ?? zones[0]
  const subtotal = cart.subtotal()
  const discountAmount = discount?.discount ?? 0
  const total = Math.max(0, subtotal + (zone?.fee ?? 0) - discountAmount)

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function applyCode() {
    if (!codeInput.trim()) return
    setCheckingCode(true)
    try {
      const res = await fetch('/api/discount/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim(), subtotal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDiscount({ code: data.code, discount: data.discount })
      toast.success(`${data.code} — ${formatPrice(data.discount)}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid code')
    } finally {
      setCheckingCode(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) {
      toast.error(t('cart.empty'))
      return
    }
    if (!form.customerName || !form.phone || !form.city || !form.address) {
      toast.error('Please fill in your name, phone, city and delivery address')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          notes: form.notes || undefined,
          deliveryZoneId: zoneId,
          discountCode: discount?.code ?? undefined,
          items: items.map((i) => ({ productId: i.productId, qty: i.qty, size: i.size, color: i.color })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not place the order')
      // Remember the order on this device so the customer can track it
      // later without retyping the order number + phone.
      saveOrder({ orderNumber: data.orderNumber, phone: form.phone.trim(), total })
      cart.clear()
      toast.success(t('checkout.orderPlaced'))
      router.push(`/checkout/payment/${data.orderNumber}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not place the order')
      setBusy(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <p className="font-display text-xl uppercase">{t('checkout.emptyBag')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('checkout.emptyBagText')}</p>
        <Link href="/shop"><Button className="mt-5 rounded-full bg-ink px-8 text-xs uppercase tracking-wider hover:bg-flame">{t('checkout.goToShop')}</Button></Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
      {/* left: details */}
      <div className="space-y-8">
        <section>
          <h2 className="font-display text-xl uppercase">{t('checkout.customerDetails')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">{t('checkout.fullName')} *</Label>
              <Input id="name" required value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="Abebe Kebede" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">{t('checkout.phone')} *</Label>
              <Input id="phone" required type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+251 9XX XXX XXX" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="city">{t('checkout.city')} *</Label>
              <Input id="city" required value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Addis Ababa" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">{t('checkout.address')} *</Label>
              <Textarea id="address" required rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Sub-city, woreda, house number, landmark…" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">{t('checkout.notes')}</Label>
              <Input id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Call before delivery, gate code, etc." className="mt-1.5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t('checkout.guestNote')}</p>
        </section>

        <section>
          <h2 className="font-display text-xl uppercase">{t('checkout.delivery')}</h2>
          <div className="mt-4 space-y-2.5">
            {zones.map((z) => (
              <label
                key={z.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors ${
                  zoneId === z.id ? 'border-ink bg-secondary/60' : 'border-border bg-card hover:border-ink/40'
                }`}
              >
                <span className="flex items-center gap-3">
                  <input type="radio" name="zone" checked={zoneId === z.id} onChange={() => setZoneId(z.id)} className="h-4 w-4 accent-black" />
                  <span>
                    <span className="block text-sm font-bold">{z.name}</span>
                    {z.estimatedDays ? <span className="block text-xs text-muted-foreground">{z.estimatedDays}</span> : null}
                  </span>
                </span>
                <span className="font-bold">{z.fee === 0 ? t('common.free') : formatPrice(z.fee)}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{deliveryNote}</p>
        </section>
      </div>

      {/* right: summary */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg uppercase">{t('checkout.yourOrder')}</h2>
          <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto thin-scrollbar pr-1">
            {items.map((item) => (
              <li key={item.key} className="flex gap-3">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                  {item.image ? <SafeImage src={item.image} alt={item.name} fill sizes="48px" className="object-cover" /> : null}
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-cream">
                    {item.qty}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">{item.size} · {item.color}</p>
                </div>
                <p className="text-xs font-bold">{formatPrice(item.price * item.qty)}</p>
              </li>
            ))}
          </ul>

          {/* discount code */}
          <div className="mt-5 border-t border-border pt-4">
            {discount ? (
              <div className="flex items-center justify-between rounded-lg bg-[#4a7c59]/10 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 font-bold text-[#4a7c59]">
                  <Tag className="h-3.5 w-3.5" /> {discount.code} — {formatPrice(discount.discount)} off
                </span>
                <button type="button" onClick={() => setDiscount(null)} aria-label="Remove code"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder={t('checkout.discountCode')} className="h-10" />
                <Button type="button" variant="outline" onClick={applyCode} disabled={checkingCode} className="rounded-lg px-4 text-xs uppercase tracking-wider">
                  {checkingCode ? '…' : t('checkout.apply')}
                </Button>
              </div>
            )}
          </div>

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('cart.subtotal')}</dt>
              <dd className="font-semibold">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('checkout.deliveryLine', { zone: zone?.name ?? '' })}</dt>
              <dd className="font-semibold">{formatPrice(zone?.fee ?? 0)}</dd>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[#4a7c59]">
                <dt>{t('checkout.discount')}</dt>
                <dd className="font-semibold">-{formatPrice(discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-display uppercase">{t('checkout.totalToPay')}</dt>
              <dd className="font-bold">{formatPrice(total)}</dd>
            </div>
          </dl>

          <Button type="submit" disabled={busy} className="mt-5 w-full rounded-full bg-flame py-6 text-xs font-bold uppercase tracking-[0.14em] hover:bg-flame-dark disabled:opacity-50">
            {busy ? t('checkout.placing') : t('checkout.placeOrder')}
          </Button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
            {t('checkout.nextStepNote')}
          </p>
        </div>
      </aside>
    </form>
  )
}
