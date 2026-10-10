'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Clock3, CircleCheckBig, CalendarDays, Wallet, Package, TriangleAlert, PackageX, Loader2, ArrowRight } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPrice, formatDateTime } from '@/lib/shared'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'

type Stats = {
  totalOrders: number
  pendingPayments: number
  verifiedPayments: number
  todayOrders: number
  products: number
  lowStock: number
  outOfStock: number
  totalRevenue: number
  recentOrders: { id: string; orderNumber: string; customerName: string; total: number; status: string; paymentStatus: string; createdAt: string; items: { name: string; qty: number }[] }[]
  revenueChart: { date: string; revenue: number; orders: number }[]
  statusCounts: { status: string; count: number }[]
}

export function AdminDashboard() {
  const { t } = useLang()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/admin/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setStats(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const cards = [
    { label: t('admin.dash.totalOrders'), value: stats.totalOrders, icon: ShoppingBag, href: '/admin/orders' },
    { label: t('admin.dash.pendingPayments'), value: stats.pendingPayments, icon: Clock3, href: '/admin/payments', alert: stats.pendingPayments > 0 },
    { label: t('admin.dash.verifiedPayments'), value: stats.verifiedPayments, icon: CircleCheckBig, href: '/admin/payments' },
    { label: t('admin.dash.todayOrders'), value: stats.todayOrders, icon: CalendarDays, href: '/admin/orders' },
    { label: t('admin.dash.revenue'), value: formatPrice(stats.totalRevenue), icon: Wallet, small: true },
    { label: t('admin.dash.products'), value: stats.products, icon: Package, href: '/admin/products' },
    { label: t('admin.dash.lowStock'), value: stats.lowStock, icon: TriangleAlert, href: '/admin/products', alert: stats.lowStock > 0 },
    { label: t('admin.dash.outOfStock'), value: stats.outOfStock, icon: PackageX, href: '/admin/products', alert: stats.outOfStock > 0 },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tight">{t('admin.dash.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.dash.sub')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} {...c} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* revenue chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg uppercase">{t('admin.dash.revenueTitle')}</h2>
            <span className="text-xs text-muted-foreground">{t('admin.dash.verifiedOnly')}</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueChart} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5)}
                  tick={{ fontSize: 10, fill: '#6f6b63' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#6f6b63' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [formatPrice(Number(v)), t('admin.dash.revenueLabel')]}
                  labelFormatter={(l) => String(l)}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e6e3da', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#ff4d00" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* recent orders */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg uppercase">{t('admin.dash.recentOrders')}</h2>
            <Link href="/admin/orders" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-flame hover:underline">
              {t('admin.dash.allOrders')} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {stats.recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('admin.dash.noOrders')}</p>
            ) : (
              stats.recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:border-ink"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold">{o.orderNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.customerName} · {t('admin.items', { count: o.items.length })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatPrice(o.total)}</p>
                    <p className={cn(
                      'text-[10px] font-bold uppercase tracking-wider',
                      o.paymentStatus === 'VERIFIED' ? 'text-[#4a7c59]' : o.paymentStatus === 'REJECTED' ? 'text-destructive' : 'text-[#b8a038]'
                    )}>
                      {t('status.' + o.status) || o.status}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* status breakdown */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg uppercase">{t('admin.dash.byStage')}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {stats.statusCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.dash.noOrders')}</p>
          ) : (
            stats.statusCounts.map((s) => (
              <span key={s.status} className="rounded-full bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-wider">
                {t('status.' + s.status)} <span className="text-flame">{s.count}</span>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ label, value, icon: Icon, href, alert, small }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; href?: string; alert?: boolean; small?: boolean }) {
  const inner = (
    <div className={cn(
      'flex h-full flex-col justify-between rounded-2xl border bg-card p-4 transition-shadow',
      alert ? 'border-flame/40 shadow-[0_0_0_1px_rgba(255,77,0,0.15)]' : 'border-border',
      href && 'hover:shadow-md'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={cn('h-4 w-4', alert ? 'text-flame' : 'text-muted-foreground')} />
      </div>
      <p className={cn('mt-3 font-display', small ? 'text-xl' : 'text-3xl')}>{value}</p>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}
