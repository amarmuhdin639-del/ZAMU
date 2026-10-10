import type { Metadata } from 'next'
import Link from 'next/link'
import { getSettings, SETTING_DEFAULTS } from '@/lib/queries'
import { RefreshCcw, Phone } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Returns & Exchange',
  description: 'Exchange and return conditions for ZAMU.',
}
export const dynamic = 'force-dynamic'

export default async function ReturnsPage() {
  const settings = await getSettings()
  const map = { ...SETTING_DEFAULTS, ...settings }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">Policies</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-tight">Returns & Exchange</h1>
      <div className="mt-4 whitespace-pre-line rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-foreground/80 sm:p-8">
        {map.returnsPolicy}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-secondary/60 p-5">
          <RefreshCcw className="h-5 w-5 text-flame" />
          <p className="mt-2 font-display text-sm uppercase tracking-wide">Damaged item?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Contact us within 48 hours of delivery with a photo of the item and your order number. We always make it right.
          </p>
        </div>
        <div className="rounded-xl bg-secondary/60 p-5">
          <Phone className="h-5 w-5 text-flame" />
          <p className="mt-2 font-display text-sm uppercase tracking-wide">How to reach us</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Phone or WhatsApp: {map.contactPhone} · Email: {map.contactEmail}. Or use the <Link href="/contact" className="underline underline-offset-2">contact page</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
