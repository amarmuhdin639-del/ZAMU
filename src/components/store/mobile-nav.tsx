'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Grid3X3, Search, Heart, ShoppingBag } from 'lucide-react'
import { useCart, useWishlist } from '@/lib/store'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const { t } = useLang()
  const pathname = usePathname()
  const openCart = useCart((s) => s.open)
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0))
  const wishCount = useWishlist((s) => s.items.length)

  const items = [
    { href: '/', label: t('nav.home'), icon: Home },
    { href: '/shop', label: t('nav.shop'), icon: Grid3X3 },
    { href: '/shop?q=', label: t('common.search'), icon: Search, search: true },
    { href: '/wishlist', label: t('mobileNav.saved'), icon: Heart, badge: wishCount },
  ]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5">
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.label} {...item} active={pathname === item.href} />
        ))}
        <button
          onClick={openCart}
          className="relative flex flex-col items-center justify-center gap-1 py-2"
          aria-label="Open cart"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-[9999px] bg-ink text-cream">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-[9999px] bg-flame px-0.5 text-[10px] font-bold text-white">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide">{t('mobileNav.bag')}</span>
        </button>
        {items.slice(2).map((item) => (
          <NavItem key={item.label} {...item} active={false} />
        ))}
      </div>
    </nav>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  search,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  badge?: number
  search?: boolean
}) {
  const content = (
    <span className="relative">
      <Icon className={cn('h-5 w-5', active ? 'text-flame' : '')} />
      {badge ? (
        <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-[9999px] bg-flame px-0.5 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </span>
  )
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-1 py-2" aria-label={label}>
      {content}
      <span className={cn('text-[10px] font-semibold uppercase tracking-wide', active ? 'text-flame' : '')}>{label}</span>
    </Link>
  )
}
