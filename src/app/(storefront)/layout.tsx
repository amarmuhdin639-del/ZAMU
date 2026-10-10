import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
import { MobileNav } from '@/components/store/mobile-nav'
import { CartDrawer } from '@/components/store/cart-drawer'
import { PWARegister } from '@/components/store/pwa'
import { LanguageProvider } from '@/lib/i18n'
import { db } from '@/lib/db'
import { getSettings, SETTING_DEFAULTS } from '@/lib/queries'
import { getSessionUser } from '@/lib/auth'

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSettings(), getSessionUser()])
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { name: true, slug: true },
    take: 12,
  })
  const map = { ...SETTING_DEFAULTS, ...settings }

  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col">
        <Header
          siteName={map.siteName}
          announcement={map.announcement}
          user={user}
          categories={categories}
        />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <Footer settings={map} />
        <MobileNav />
        <CartDrawer />
        <PWARegister siteName={map.siteName} />
      </div>
    </LanguageProvider>
  )
}
