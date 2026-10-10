import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getSettings, SETTING_DEFAULTS } from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { Heart, ShieldCheck, Truck, MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Us — A Family Business',
  description: 'ZAMU is a family-owned clothing business selling jerseys, baggy pants and streetwear from Addis Ababa.',
}
export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const settings = await getSettings()
  const map = { ...SETTING_DEFAULTS, ...settings }

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">Who we are</p>
        <h1 className="mt-1 max-w-3xl font-display text-4xl uppercase leading-[1.05] tracking-tight sm:text-6xl">{map.aboutTitle}</h1>
      </section>

      <section className="mx-auto mt-8 grid max-w-7xl gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div className="relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-2xl bg-flame p-10 text-center">
          <p className="wordmark text-[26vw] leading-none text-cream sm:text-[120px]" aria-hidden>Z</p>
          <p className="mt-3 font-display text-[11px] uppercase tracking-[0.34em] text-cream/90 sm:text-xs">A family thing · Addis Ababa</p>
        </div>
        <div>
          <p className="whitespace-pre-line text-base leading-relaxed text-foreground/80">{map.aboutText}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { icon: Heart, title: 'Family-run', text: 'Every order is checked and packed by the family — no faceless warehouse.' },
              { icon: ShieldCheck, title: 'Honest payments', text: 'We verify every payment by hand. No auto-approvals, no surprises.' },
              { icon: Truck, title: 'Fast Addis delivery', text: 'Orders move out right after verification — usually same or next day.' },
              { icon: MessageCircle, title: 'Always reachable', text: 'Call, WhatsApp or Telegram — you talk directly to us.' },
            ].map((v) => (
              <div key={v.title} className="rounded-xl bg-secondary/60 p-4">
                <v.icon className="h-5 w-5 text-flame" />
                <p className="mt-2 font-display text-sm uppercase tracking-wide">{v.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-14 text-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <h2 className="font-display text-2xl uppercase">What we sell</h2>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                Football jerseys, baggy pants, oversized t-shirts, heavyweight hoodies, tracksuits, shorts, jackets and streetwear accessories — picked for young people who care about fit.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl uppercase">Where to find us</h2>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">{map.contactAddress}</p>
              <p className="mt-1 text-sm text-cream/70">Phone: {map.contactPhone}</p>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <Link href="/shop"><Button className="rounded-full bg-flame px-7 text-xs uppercase tracking-wider hover:bg-white hover:text-ink">Shop the collection</Button></Link>
              <Link href="/contact"><Button variant="outline" className="rounded-full border-cream/30 px-7 text-xs uppercase tracking-wider text-cream hover:bg-cream hover:text-ink">Contact us</Button></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
