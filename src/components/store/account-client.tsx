'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Package, LogOut, Loader2, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWishlist } from '@/lib/store'
import { MediaBox } from './media-box'
import { useLang } from '@/lib/i18n'
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/shared'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { SafeUser } from '@/lib/auth'

type AccountOrder = {
  id: string
  orderNumber: string
  total: number
  status: string
  paymentStatus: string
  createdAt: string
  items: { id: string; name: string; image: string | null; qty: number; size: string; color: string; price: number }[]
}

export function AccountClient({ user }: { user: SafeUser | null }) {
  const sp = useSearchParams()
  const router = useRouter()
  const { t } = useLang()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success(t('account.signedOut'))
    router.push('/')
    router.refresh()
  }

  if (!user) {
    return <AuthForms initialTab={sp.get('tab') === 'register' ? 'register' : 'login'} />
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-[9999px] bg-ink text-cream">
            <User className="h-5 w-5" />
          </div>
          <p className="mt-3 font-bold">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.phone}</p>
          <nav className="mt-5 flex gap-1 overflow-x-auto lg:flex-col">
            <Link href="#orders" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-secondary">
              <Package className="h-4 w-4" /> {t('account.myOrders')}
            </Link>
            <Link href="#profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-secondary">
              <User className="h-4 w-4" /> {t('account.profile')}
            </Link>
            <Link href="/wishlist" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-secondary">
              <Heart className="h-4 w-4" /> {t('nav.wishlist')}
            </Link>
            <button onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive hover:bg-destructive/5">
              <LogOut className="h-4 w-4" /> {t('nav.signOut')}
            </button>
          </nav>
        </div>
      </aside>
      <div className="space-y-12">
        <OrdersSection userId={user.id} />
        <ProfileSection user={user} />
      </div>
    </div>
  )
}

function AuthForms({ initialTab }: { initialTab: 'login' | 'register' }) {
  const [tab, setTab] = useState(initialTab)
  const router = useRouter()
  const { t } = useLang()
  const wishlist = useWishlist()
  const [busy, setBusy] = useState(false)
  const [login, setLogin] = useState({ identifier: '', password: '' })
  const [reg, setReg] = useState({ name: '', phone: '', email: '', password: '' })

  async function doLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Staff accounts use this same public sign-in and are routed to their
      // workspace. Nothing on this page advertises that the role exists.
      if (data.user.role === 'ADMIN') {
        toast.success(t('auth.welcomeBack', { name: data.user.name }))
        router.push('/admin')
        router.refresh()
        return
      }
      await syncWishlist()
      toast.success(t('auth.welcomeBack', { name: data.user.name }))
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  async function doRegister(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await syncWishlist()
      toast.success(t('auth.accountCreated'))
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create account')
    } finally {
      setBusy(false)
    }
  }

  // merge local wishlist into account
  async function syncWishlist() {
    for (const item of wishlist.items) {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.productId }),
      }).catch(() => {})
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="grid grid-cols-2 rounded-full border border-border p-1">
        {(['login', 'register'] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              'rounded-full py-2.5 text-xs font-bold uppercase tracking-wider transition-colors',
              tab === tb ? 'bg-ink text-cream' : 'text-muted-foreground'
            )}
          >
            {tb === 'login' ? t('nav.signIn') : t('nav.createAccount')}
          </button>
        ))}
      </div>

      {tab === 'login' ? (
        <form onSubmit={doLogin} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <Label htmlFor="lid">{t('auth.phoneOrEmail')}</Label>
            <Input id="lid" required value={login.identifier} onChange={(e) => setLogin({ ...login, identifier: e.target.value })} placeholder="+251 9XX XXX XXX" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="lpw">{t('auth.password')}</Label>
            <Input id="lpw" required type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} className="mt-1.5" />
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-full bg-ink py-6 text-xs uppercase tracking-wider hover:bg-flame disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('nav.signIn')}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t('auth.guestNote')}</p>
        </form>
      ) : (
        <form onSubmit={doRegister} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <Label htmlFor="rn">{t('auth.fullName')}</Label>
            <Input id="rn" required value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="rp">{t('auth.phone')}</Label>
            <Input id="rp" required type="tel" value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} placeholder="+251 9XX XXX XXX" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="re">{t('auth.emailOptional')}</Label>
            <Input id="re" type="email" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="rpw">{t('auth.passwordHint')}</Label>
            <Input id="rpw" required type="password" minLength={8} value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} className="mt-1.5" />
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-full bg-ink py-6 text-xs uppercase tracking-wider hover:bg-flame disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('nav.createAccount')}
          </Button>
        </form>
      )}
    </div>
  )
}

function OrdersSection({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<AccountOrder[] | null>(null)
  const { t } = useLang()

  const load = useCallback(() => {
    fetch('/api/account/orders')
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]))
  }, [])

  useEffect(() => {
    load()
  }, [load, userId])

  return (
    <section id="orders" className="scroll-mt-28">
      <h2 className="font-display text-2xl uppercase">{t('account.myOrders')}</h2>
      {orders === null ? (
        <div className="mt-4 space-y-3">{[1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-display text-lg uppercase">{t('account.noOrders')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('account.noOrdersText')}</p>
          <Link href="/shop"><Button className="mt-4 rounded-full bg-ink px-6 text-xs uppercase tracking-wider hover:bg-flame">{t('account.startShopping')}</Button></Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((o) => (
            <article key={o.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                    o.paymentStatus === 'VERIFIED' ? 'bg-[#4a7c59]/10 text-[#4a7c59]' : o.paymentStatus === 'REJECTED' ? 'bg-destructive/10 text-destructive' : 'bg-[#b8a038]/10 text-[#b8a038]'
                  )}>
                    {t(`paystatus.${o.paymentStatus}`)}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">{t(`status.${o.status}`)}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 4).map((item, i) => (
                    <div key={i} className="relative h-11 w-9 overflow-hidden rounded-md border-2 border-card bg-secondary">
                      {item.image ? <MediaBox src={item.image} alt={item.name} sizes="36px" className="object-cover" /> : null}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold">{formatPrice(o.total)}</span>
                  <Link href={`/track?orderNumber=${o.orderNumber}`}>
                    <Button variant="outline" size="sm" className="rounded-full text-[11px] uppercase tracking-wider">{t('account.track')}</Button>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function ProfileSection({ user }: { user: SafeUser }) {
  const { t } = useLang()
  const [form, setForm] = useState({
    name: user.name,
    email: user.email ?? '',
    city: user.city ?? '',
    address: user.address ?? '',
    telegram: user.telegram ?? '',
    whatsapp: user.whatsapp ?? '',
    password: '',
  })
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const payload: Record<string, string> = {}
      for (const [k, v] of Object.entries(form)) if (v && !(k === 'password' && !v)) payload[k] = v
      const res = await fetch('/api/account/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t('account.saved'))
      setForm((f) => ({ ...f, password: '' }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save profile')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="profile" className="scroll-mt-28">
      <h2 className="font-display text-2xl uppercase">{t('account.profileTitle')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('account.profileText')}</p>
      <form onSubmit={save} className="mt-4 grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="pn">{t('auth.fullName')}</Label>
          <Input id="pn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="pe">{t('auth.emailOptional')}</Label>
          <Input id="pe" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="pc">{t('account.city')}</Label>
          <Input id="pc" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="pt">Telegram</Label>
          <Input id="pt" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} className="mt-1.5" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="pa">{t('account.address')}</Label>
          <Input id="pa" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="pw">{t('account.newPassword')}</Label>
          <Input id="pw" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5" />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy} className="rounded-full bg-ink px-8 text-xs uppercase tracking-wider hover:bg-flame">
            {busy ? 'Saving…' : t('account.save')}
          </Button>
        </div>
      </form>
    </section>
  )
}
