import type { Metadata } from 'next'
import { getSettings, SETTING_DEFAULTS } from '@/lib/queries'
import { Phone, Mail, MapPin, MessageCircle, Instagram } from 'lucide-react'
import Link from 'next/link'

/** TikTok has no lucide glyph — brand path drawn inline. */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Call, WhatsApp, Instagram or email ZAMU — a family-owned streetwear store in Addis Ababa.',
}
export const dynamic = 'force-dynamic'

export default async function ContactPage() {
  const settings = await getSettings()
  const map = { ...SETTING_DEFAULTS, ...settings }
  const wa = (map.contactWhatsapp ?? '').replace(/[^0-9]/g, '')

  const channels = [
    { icon: Phone, label: 'Call Us', value: map.contactPhone, href: `tel:${map.contactPhone}`, cta: 'Call Now' },
    { icon: MessageCircle, label: 'WhatsApp', value: map.contactWhatsapp, href: `https://wa.me/${wa}`, cta: 'Chat on WhatsApp' },
    { icon: TikTokIcon, label: 'TikTok', value: `@${(map.contactTiktok ?? '').replace('@', '')}`, href: `https://tiktok.com/@${(map.contactTiktok ?? '').replace('@', '')}`, cta: 'Follow' },
    { icon: Instagram, label: 'Instagram', value: `@${(map.contactInstagram ?? '').replace('@', '')}`, href: `https://instagram.com/${(map.contactInstagram ?? '').replace('@', '')}`, cta: 'Follow' },
    { icon: Mail, label: 'Email', value: map.contactEmail, href: `mailto:${map.contactEmail}`, cta: 'Send email' },
  ].filter((c) => c.value)

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">Talk to the family</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-tight sm:text-5xl">Contact Us</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Questions about a product, an order, sizing or delivery? We answer fast — usually within the hour during working hours (8:00–20:00 EAT).
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-lg"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-flame transition-colors group-hover:bg-flame group-hover:text-white">
              <c.icon className="h-5 w-5" />
            </span>
            <span className="mt-4 font-display text-lg uppercase">{c.label}</span>
            <span className="mt-1 break-all text-sm text-muted-foreground">{c.value}</span>
            <span className="mt-4 text-[11px] font-bold uppercase tracking-wider text-flame">{c.cta} →</span>
          </a>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-secondary/60 p-6 sm:p-8">
        <h2 className="font-display text-xl uppercase">Before you write…</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· To check where your order is, use <Link href="/track" className="font-semibold text-foreground underline underline-offset-4 hover:text-flame">Track Order</Link> — it is instant.</li>
          <li>· Not sure about size? Check the <Link href="/size-guide" className="font-semibold text-foreground underline underline-offset-4 hover:text-flame">Size Guide</Link> first.</li>
          <li>· Delivery questions are answered in <Link href="/delivery" className="font-semibold text-foreground underline underline-offset-4 hover:text-flame">Delivery Info</Link>.</li>
          <li>· Find us: {map.contactAddress}</li>
        </ul>
      </div>
    </div>
  )
}
