import type { Metadata } from 'next'
import { getSettings, SETTING_DEFAULTS } from '@/lib/queries'
import { MapPin } from 'lucide-react'
import Link from 'next/link'
import { SocialIcon } from '@/components/store/social-icons'
import { parseSocialLinks, socialHref, socialLabel, socialDisplay } from '@/lib/social'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Call, WhatsApp, Instagram or email ZAMU — a family-owned streetwear store in Addis Ababa.',
}
export const dynamic = 'force-dynamic'

export default async function ContactPage() {
  const settings = await getSettings()
  const map = { ...SETTING_DEFAULTS, ...settings }
  const socials = parseSocialLinks(map.socialLinks, {
    whatsapp: map.contactWhatsapp,
    tiktok: map.contactTiktok,
    instagram: map.contactInstagram,
  })
  const channels = [
    { kind: 'phone', label: 'Call Us', value: map.contactPhone, href: `tel:${map.contactPhone}`, cta: 'Call Now' },
    { kind: 'email', label: 'Email', value: map.contactEmail, href: `mailto:${map.contactEmail}`, cta: 'Send email' },
    ...socials.map((s) => ({
      kind: s.type as string,
      label: socialLabel(s.type),
      value: socialDisplay(s.type, s.url),
      href: socialHref(s.type, s.url),
      cta: s.type === 'whatsapp' ? 'Chat on WhatsApp' : 'Follow',
    })),
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
              <SocialIcon type={c.kind} className="h-5 w-5" />
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
