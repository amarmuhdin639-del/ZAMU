import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { getSettings, SETTING_DEFAULTS } from '@/lib/queries'
import { getSessionUser } from '@/lib/auth'
import { CheckoutForm } from '@/components/store/checkout-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Checkout' }
export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const [zones, user, settings] = await Promise.all([
    db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    getSessionUser(),
    getSettings(),
  ])
  const map = { ...SETTING_DEFAULTS, ...settings }

  if (zones.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl uppercase">Checkout unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The store owner has not configured delivery zones yet. Please check back soon or contact us directly.
        </p>
        <Link href="/contact"><Button className="mt-5 rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame">Contact us</Button></Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-cream">1</span>
        <span>Details</span>
        <span className="h-px w-8 bg-border" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground">2</span>
        <span className="text-muted-foreground">Payment</span>
        <span className="h-px w-8 bg-border" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground">3</span>
        <span className="text-muted-foreground">Done</span>
      </div>
      <h1 className="font-display text-4xl uppercase tracking-tight">Checkout</h1>
      <CheckoutForm zones={zones} user={user} deliveryNote={map.estimatedDeliveryNote} />
    </div>
  )
}
