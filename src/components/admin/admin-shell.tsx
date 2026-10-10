'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Wallet, Settings, ScrollText, LogOut, Store, Bell, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/shared'
import { useLang, LangSwitch } from '@/lib/i18n'

const NAV = [
  { href: '/admin', key: 'admin.nav.dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', key: 'admin.nav.products', icon: Package },
  { href: '/admin/orders', key: 'admin.nav.orders', icon: ShoppingBag },
  { href: '/admin/payments', key: 'admin.nav.payments', icon: Wallet },
  { href: '/admin/settings', key: 'admin.nav.settings', icon: Settings },
  { href: '/admin/audit', key: 'admin.nav.audit', icon: ScrollText },
]

type Notification = { id: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string }

export function AdminShell({ adminName, children }: { adminName: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLang()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [bellOpen, setBellOpen] = useState(false)

  useEffect(() => {
    const load = () =>
      fetch('/api/admin/notifications')
        .then((r) => (r.ok ? r.json() : { unread: 0, notifications: [] }))
        .then((d) => {
          setUnread(d.unread ?? 0)
          setNotifs(d.notifications ?? [])
        })
        .catch(() => {})
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [pathname])

  async function markAllRead() {
    await fetch('/api/admin/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setUnread(0)
    setNotifs((n) => n.map((x) => ({ ...x, read: true })))
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success(t('admin.signedOut'))
    router.push('/account?tab=login')
    router.refresh()
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2 px-6 py-6">
        <span className="wordmark text-2xl uppercase tracking-tight text-cream">
          ZAMU<span className="text-flame">.</span>
        </span>
        <span className="rounded bg-flame/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-flame">{t('admin.badge')}</span>
      </Link>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors',
                active ? 'bg-flame text-white' : 'text-cream/60 hover:bg-white/5 hover:text-cream'
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.key)}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-cream/60 hover:bg-white/5 hover:text-cream">
          <Store className="h-4 w-4" /> {t('admin.viewStorefront')}
        </Link>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold text-cream/60 hover:bg-white/5 hover:text-cream">
          <LogOut className="h-4 w-4" /> {t('admin.signOut')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f4f2ec]">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-ink lg:block">{sidebar}</aside>

      {/* mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-ink">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-[#f4f2ec]/95 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="p-2 lg:hidden" aria-label={t('admin.openMenu')}>
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold">{t('admin.signedInAs')} <span className="text-flame">{adminName}</span></p>
          <div className="ml-auto flex items-center gap-1">
            <LangSwitch />
            <button onClick={() => { setBellOpen((v) => !v); if (unread) markAllRead() }} className="relative rounded-full p-2 hover:bg-secondary" aria-label={t('admin.notifications')}>
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-flame px-0.5 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </div>
        </header>

        {bellOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)}>
            <div className="absolute right-4 top-16 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl sm:right-8" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('admin.notifications')}</div>
              <div className="max-h-96 overflow-y-auto thin-scrollbar">
                {notifs.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t('admin.noNotifications')}</p>
                ) : (
                  notifs.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link ?? '#'}
                      onClick={() => setBellOpen(false)}
                      className={cn('block border-b border-border/60 px-4 py-3 hover:bg-secondary/50', !n.read && 'bg-flame/5')}
                    >
                      <p className="text-sm font-bold">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
