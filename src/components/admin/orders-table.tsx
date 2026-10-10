'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatPrice, formatDateTime } from '@/lib/shared'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'

type AdminOrder = {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  city: string
  total: number
  status: string
  paymentStatus: string
  createdAt: string
  items: { name: string; qty: number }[]
  payment: { status: string; methodName: string } | null
}

const FILTERS = [
  { key: '', labelKey: 'admin.filters.all' },
  { key: 'PENDING_PAY', labelKey: 'admin.filters.paymentPending' },
  { key: 'PAYMENT_VERIFIED', labelKey: 'admin.filters.verified' },
  { key: 'PREPARING', labelKey: 'admin.filters.preparing' },
  { key: 'OUT_FOR_DELIVERY', labelKey: 'admin.filters.outForDelivery' },
  { key: 'DELIVERED', labelKey: 'admin.filters.delivered' },
  { key: 'CANCELLED', labelKey: 'admin.filters.cancelled' },
]

export function AdminOrders() {
  const { t } = useLang()
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('')

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (filter === 'PENDING_PAY') params.set('paymentStatus', 'PENDING')
    else if (filter) params.set('status', filter)
    fetch(`/api/admin/orders?${params}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]))
  }, [q, filter])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tight">{t('admin.orders.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.orders.sub')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.orders.search')} className="pl-10" />
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
                filter === f.key ? 'border-ink bg-ink text-cream' : 'border-border bg-card hover:border-ink'
              )}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {orders === null ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : orders.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">{t('admin.orders.noMatch')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">{t('admin.orders.h.order')}</th>
                  <th className="px-4 py-3">{t('admin.orders.h.customer')}</th>
                  <th className="px-4 py-3">{t('admin.orders.h.items')}</th>
                  <th className="px-4 py-3">{t('admin.orders.h.total')}</th>
                  <th className="px-4 py-3">{t('admin.orders.h.payment')}</th>
                  <th className="px-4 py-3">{t('admin.orders.h.stage')}</th>
                  <th className="px-4 py-3">{t('admin.orders.h.date')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-bold hover:text-flame hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{o.customerName}</p>
                      <p className="text-xs text-muted-foreground">{o.phone} · {o.city}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t('admin.items', { count: o.items.reduce((n, i) => n + i.qty, 0) })}</td>
                    <td className="px-4 py-3 font-bold">{formatPrice(o.total)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        o.paymentStatus === 'VERIFIED' ? 'bg-[#4a7c59]/10 text-[#4a7c59]' : o.paymentStatus === 'REJECTED' ? 'bg-destructive/10 text-destructive' : 'bg-[#b8a038]/10 text-[#b8a038]'
                      )}>
                        {t('paystatus.' + o.paymentStatus)}
                      </span>
                      {o.payment?.methodName && <p className="mt-0.5 text-[10px] text-muted-foreground">{o.payment.methodName}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">{t('status.' + o.status)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
