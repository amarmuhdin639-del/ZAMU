import Link from 'next/link'
import { Phone, Mail, MapPin } from 'lucide-react'
import type { SettingsMap } from '@/lib/queries'
import { SETTING_DEFAULTS } from '@/lib/queries'
import { T, LangSwitch } from '@/lib/i18n'
import { PWAInstallButton } from '@/components/store/pwa'
import { SocialRow } from '@/components/store/social-icons'
import { parseSocialLinks } from '@/lib/social'
import { CrownLogo } from '@/components/store/logo'

const PAY_METHODS = ['Telebirr', 'CBE Birr', 'Bank Transfer']

export function Footer({ settings }: { settings: SettingsMap }) {
  const site = settings.siteName || SETTING_DEFAULTS.siteName
  const socials = parseSocialLinks(settings.socialLinks, {
    whatsapp: settings.contactWhatsapp,
    tiktok: settings.contactTiktok,
    instagram: settings.contactInstagram,
  })
  return (
    <footer className="mt-auto border-t border-border bg-ink text-cream/90">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-2">
            { }
            <CrownLogo className="h-16 w-16" />
            <p className="wordmark mt-3 text-3xl uppercase tracking-tight text-cream">
              {site}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.34em] text-cream/45">Clothing Co.</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-cream/60">
              <T k="footer.tagline" />
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {PAY_METHODS.map((m) => (
                <span key={m} className="rounded-md border border-cream/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cream/70">
                  {m}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cream/40">
                  <T k="common.language" />
                </p>
                <LangSwitch dark />
              </div>
              <PWAInstallButton />
            </div>
            <div className="mt-6">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cream/40">Follow</p>
              <SocialRow links={socials} />
            </div>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-cream/50"><T k="footer.shop" /></p>
            <ul className="space-y-2.5 text-sm">
              {[
                ['footer.allProducts', '/shop'],
                ['footer.jerseys', '/shop/jerseys'],
                ['footer.baggyPants', '/shop/baggy-pants'],
                ['footer.newArrivals', '/shop?isNew=1'],
                ['footer.sale', '/shop?onSale=1'],
              ].map(([labelKey, href]) => (
                <li key={href}>
                  <Link href={href} className="text-cream/70 transition-colors hover:text-flame">
                    <T k={labelKey} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-cream/50"><T k="footer.help" /></p>
            <ul className="space-y-2.5 text-sm">
              {[
                ['footer.contact', '/contact'],
                ['footer.trackOrder', '/track'],
                ['footer.sizeGuide', '/size-guide'],
                ['footer.deliveryInfo', '/delivery'],
                ['footer.returns', '/returns'],
              ].map(([labelKey, href]) => (
                <li key={href}>
                  <Link href={href} className="text-cream/70 transition-colors hover:text-flame">
                    <T k={labelKey} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-cream/50"><T k="footer.company" /></p>
            <ul className="space-y-2.5 text-sm">
              {[
                ['footer.about', '/about'],
                ['footer.privacy', '/privacy'],
                ['footer.terms', '/terms'],
              ].map(([labelKey, href]) => (
                <li key={href}>
                  <Link href={href} className="text-cream/70 transition-colors hover:text-flame">
                    <T k={labelKey} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-cream/10 pt-6 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site} · Clothing Co. <T k="footer.rights" />
            <span className="ml-1 select-none opacity-70 transition-opacity hover:opacity-100" title="RJA">
              · Made by <span className="font-bold tracking-wide">RJA</span>
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <SocialRow links={socials} />
            {settings.contactPhone ? (
              <a href={`tel:${settings.contactPhone}`} className="flex items-center gap-1.5 hover:text-flame">
                <Phone className="h-3.5 w-3.5" /> {settings.contactPhone}
              </a>
            ) : null}
            {settings.contactEmail ? (
              <a href={`mailto:${settings.contactEmail}`} className="flex items-center gap-1.5 hover:text-flame">
                <Mail className="h-3.5 w-3.5" /> {settings.contactEmail}
              </a>
            ) : null}
            {settings.contactAddress ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {settings.contactAddress}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  )
}
