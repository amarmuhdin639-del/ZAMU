'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, Search, ShoppingBag, Heart, User, X, ChevronRight } from 'lucide-react'
import { LangSwitch, useLang } from '@/lib/i18n'
import { useCart, useWishlist } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useMounted } from '@/hooks/use-mounted'
import type { SafeUser } from '@/lib/auth'

const NAV = [
  { href: '/', labelKey: 'nav.home' },
  { href: '/shop', labelKey: 'nav.shop' },
  { href: '/shop?sort=newest&isNew=1', labelKey: 'nav.newArrivals', match: '/shop' },
  { href: '/shop?featured=1', labelKey: 'nav.featured', match: '/shop' },
  { href: '/about', labelKey: 'nav.about' },
  { href: '/contact', labelKey: 'nav.contact' },
]

type Props = {
  siteName: string
  announcement: string
  user: SafeUser | null
  categories: { name: string; slug: string }[]
}

export function Header({ siteName, announcement, user, categories }: Props) {
  const { t } = useLang()
  const pathname = usePathname()
  const router = useRouter()
  const mounted = useMounted()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0))
  const wishCount = useWishlist((s) => s.items.length)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    const raf = requestAnimationFrame(onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  // close menus when route changes (adjust-during-render pattern)
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    if (menuOpen) setMenuOpen(false)
    if (searchOpen) setSearchOpen(false)
  }
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 60)
  }, [searchOpen])

  const submitSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      const q = query.trim()
      if (!q) return
      setSearchOpen(false)
      router.push(`/shop?q=${encodeURIComponent(q)}`)
    },
    [query, router]
  )

  async function logout() {
    setBusy(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    setBusy(false)
    toast.success(t('account.signedOut'))
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* announcement bar */}
      <div className="bg-ink text-cream overflow-hidden">
        <div className="marquee-track py-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
          <span className="px-8">{announcement}</span>
          <span className="px-8">{announcement}</span>
          <span className="px-8">{announcement}</span>
          <span className="px-8">{announcement}</span>
        </div>
      </div>

      <header
        className={cn(
          'sticky top-0 z-50 bg-background/95 backdrop-blur transition-shadow',
          scrolled ? 'shadow-[0_1px_0_0_var(--border),0_8px_24px_-16px_rgba(20,20,18,0.25)]' : 'border-b border-transparent'
        )}
      >
        <div className="border-b border-border/70">
          <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            {/* mobile hamburger */}
            <button
              className="p-2 -ml-2 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* desktop nav — left, like wantsandneeds */}
            <nav className="hidden lg:flex items-center gap-7 text-[13px] font-semibold uppercase tracking-wide">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={pathname === item.href.split('?')[0] && !item.href.includes('?')}
                  className={cn(
                    'nav-link transition-colors hover:text-foreground',
                    pathname === item.href.split('?')[0] && !item.href.includes('?') ? 'text-foreground' : 'text-foreground/70'
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>

            {/* logo — dead center */}
            <Link
              href="/"
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-baseline gap-1"
              aria-label={`${siteName} home`}
            >
              <span className="wordmark text-[26px] leading-none uppercase">{siteName}</span>
              <span className="hidden sm:inline-block h-2 w-2 rounded-[2px] bg-flame" />
            </Link>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <div className="mr-1 hidden md:block">
                <LangSwitch />
              </div>
              <button
                onClick={() => setSearchOpen((v) => !v)}
                className="p-2.5 rounded-full hover:bg-secondary transition-colors"
                aria-label="Search"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
              <Link
                href="/wishlist"
                className="relative p-2.5 rounded-full hover:bg-secondary transition-colors"
                aria-label="Wishlist"
              >
                <Heart className="h-[18px] w-[18px]" />
                {mounted && wishCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-flame text-white text-[10px] font-bold flex items-center justify-center">
                    {wishCount > 9 ? '9+' : wishCount}
                  </span>
                )}
              </Link>
              <Link
                href={user ? '/account' : '/account?tab=login'}
                className="hidden sm:flex p-2.5 rounded-full hover:bg-secondary transition-colors"
                aria-label="Account"
                title={user ? `Hi, ${user.name}` : 'Sign in'}
              >
                <User className="h-[18px] w-[18px]" />
              </Link>
              <CartButton count={mounted ? cartCount : 0} />
            </div>
          </div>
        </div>

        {/* search bar */}
        {searchOpen && (
          <div className="border-b border-border bg-background">
            <form onSubmit={submitSearch} className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Search products"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="p-1.5">
                <X className="h-4 w-4" />
              </button>
              <button
                type="submit"
                className="hidden sm:block rounded-full bg-ink px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cream hover:bg-flame transition-colors"
              >
                {t('common.search')}
              </button>
            </form>
          </div>
        )}
      </header>

      {/* mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="wordmark text-xl uppercase">{siteName}</span>
              <div className="flex items-center gap-2">
                <LangSwitch />
                <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="p-1.5">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto thin-scrollbar px-5 py-4">
              {user ? (
                <div className="mb-4 rounded-xl bg-secondary px-4 py-3">
                  <p className="text-xs text-muted-foreground">{t('nav.signedInAs')}</p>
                  <p className="font-bold">{user.name}</p>
                </div>
              ) : null}
              <nav className="flex flex-col">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between border-b border-border/70 py-3.5 font-display text-lg uppercase tracking-wide"
                  >
                    {t(item.labelKey)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </nav>
              <p className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{t('common.categories')}</p>
              <div className="flex flex-wrap gap-2 pb-2">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/shop/${c.slug}`}
                    className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide hover:border-ink transition-colors"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="border-t border-border p-5">
              {user ? (
                <div className="flex gap-2">
                  <Link
                    href="/account"
                    className="flex-1 rounded-full bg-ink py-3 text-center text-xs font-bold uppercase tracking-wider text-cream"
                  >
                    {t('nav.myAccount')}
                  </Link>
                  <button
                    onClick={logout}
                    disabled={busy}
                    className="flex-1 rounded-full border border-border py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    {t('nav.signOut')}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/account?tab=login"
                    className="flex-1 rounded-full bg-ink py-3 text-center text-xs font-bold uppercase tracking-wider text-cream"
                  >
                    {t('nav.signIn')}
                  </Link>
                  <Link
                    href="/account?tab=register"
                    className="flex-1 rounded-full border border-ink py-3 text-center text-xs font-bold uppercase tracking-wider"
                  >
                    {t('nav.createAccount')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CartButton({ count }: { count: number }) {
  const open = useCart((s) => s.open)
  return (
    <button
      onClick={open}
      className="relative p-2.5 rounded-full hover:bg-secondary transition-colors"
      aria-label="Open cart"
    >
      <ShoppingBag className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-flame text-white text-[10px] font-bold flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}
