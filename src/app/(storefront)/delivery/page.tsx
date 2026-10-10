import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getSettings, SETTING_DEFAULTS } from '@/lib/queries'
import { Truck, MapPin, Clock3 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Delivery Information',
  description: 'Delivery zones, fees and timelines for ZAMU orders.',
}
export const dynamic = 'force-dynamic'

export default async function DeliveryPage() {
  const [settings, zones] = await Promise.all([
    getSettings(),
    db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
  ])
  const map = { ...SETTING_DEFAULTS, ...settings }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">Shipping</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-tight">Delivery Info</h1>
      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{map.deliveryInfo}</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">Zone</th>
              <th className="px-5 py-3">Fee</th>
              <th className="px-5 py-3">Estimated time</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} className="border-t border-border">
                <td className="px-5 py-3.5 font-bold">{z.name}</td>
                <td className="px-5 py-3.5">{z.fee === 0 ? 'Free' : `ETB ${z.fee.toLocaleString()}`}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{z.estimatedDays ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Truck, t: 'After payment', d: 'We prepare orders as soon as payment is verified by our team — never before.' },
          { icon: MapPin, t: 'Your address', d: 'Double-check your sub-city and landmark at checkout so the rider finds you fast.' },
          { icon: Clock3, t: 'Track anytime', d: 'Use Track Order with your order number and phone for live status.' },
        ].map((v) => (
          <div key={v.t} className="rounded-xl bg-secondary/60 p-4">
            <v.icon className="h-5 w-5 text-flame" />
            <p className="mt-2 font-display text-sm uppercase tracking-wide">{v.t}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{v.d}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Questions? <Link href="/contact" className="font-semibold text-foreground underline underline-offset-4 hover:text-flame">Contact us</Link> or <Link href="/track" className="font-semibold text-foreground underline underline-offset-4 hover:text-flame">track your order</Link>.
      </p>
    </div>
  )
}
