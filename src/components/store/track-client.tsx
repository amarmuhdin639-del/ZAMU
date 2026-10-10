'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CircleCheckBig, Loader2, LifeBuoy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice, formatDateTime, ORDER_TIMELINE } from '@/lib/shared'
import { useLang } from '@/lib/i18n'
import { pickReason } from '@/lib/reason'
import { cn } from '@/lib/utils'
import { getSavedOrders, saveOrder, removeSavedOrder, updateSavedStatus, type SavedOrder } from '@/lib/saved-orders'
import { toast } from 'sonner'
import { SafeImage } from './media-box'
import Link from 'next/link'

type TrackedOrder = {
  orderNumber: string
  customerName: string
  city: string
  address: string
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  status: string
  paymentStatus: string
  estimatedDelivery: string | null
  rejectionReason: string | null
  rejectionReasonEn?: string | null
  rejectionReasonAm?: string | null
  createdAt: string
  items: { id: string; name: string; image: string | null; qty: number; size: string; color: string; price: number }[]
  payment: { status: string; methodName: string; transactionRef: string; rejectionReason: string | null; rejectionReasonEn?: string | null; rejectionReasonAm?: string | null } | null
  updates?: { status: string; message: string | null; messageEn: string | null; messageAm: string | null; trackingCode: string | null; createdAt: string }[]
}

export function TrackClient() {
  const sp = useSearchParams()
  const { t, lang } = useLang()
  const [orderNumber, setOrderNumber] = useState(sp.get('orderNumber') ?? '')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<SavedOrder[]>([])
  const autoRan = useRef(false)

  // Core tracking call — takes explicit values so saved-order taps and the
  // auto-run can bypass async state updates. Only touches stable setters,
  // so it is safe to call from a mount-time effect.
  const runTrack = useCallback(async (on: string, ph: string) => {
    const num = on.trim()
    const tel = ph.trim()
    if (!num || !tel) return
    setBusy(true)
    setError(null)
    setOrder(null)
    try {
      const res = await fetch(`/api/track?orderNumber=${encodeURIComponent(num)}&phone=${encodeURIComponent(tel)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Order not found')
      setOrder(data.order)
      setOrderNumber(num)
      setPhone(tel)
      // Ownership proven (order number + phone) — remember on this device
      // so the customer never has to retype them.
      setSaved(saveOrder({ orderNumber: num, phone: tel, total: data.order.total, status: data.order.status }))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order not found')
    } finally {
      setBusy(false)
    }
  }, [])

  // Load device-saved orders; auto-track when arriving from a link
  // (payment success, account page) whose order we already know; quietly
  // refresh the stored statuses so the list shows live progress.
  useEffect(() => {
    const list = getSavedOrders()
    setSaved(list)
    const qOn = (sp.get('orderNumber') ?? '').trim()
    if (!autoRan.current && qOn) {
      autoRan.current = true
      const hit = list.find((o) => o.orderNumber.toUpperCase() === qOn.toUpperCase())
      const qPh = (sp.get('phone') ?? '').trim()
      const ph = qPh || hit?.phone
      if (ph) void runTrack(qOn, ph)
    }
    let cancelled = false
    ;(async () => {
      for (const o of list.slice(0, 8)) {
        try {
          const res = await fetch(`/api/track?orderNumber=${encodeURIComponent(o.orderNumber)}&phone=${encodeURIComponent(o.phone)}`)
          if (!res.ok) continue
          const data = await res.json()
          if (!cancelled && data.order?.status) setSaved(updateSavedStatus(o.orderNumber, data.order.status))
        } catch {
          // offline / quiet refresh — badges just keep their last known status
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sp, runTrack])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">{t('payment.order')} status</p>
        <h1 className="mt-1 font-display text-4xl uppercase tracking-tight">{t('track.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('track.subtitle')}</p>
      </div>

      {/* orders remembered on this device — guests track in one tap */}
      {saved.length > 0 && (
        <section className="mx-auto mt-8 max-w-xl rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('track.savedTitle')}</p>
          <ul className="mt-2 divide-y divide-border">
            {saved.map((o) => (
              <li key={o.orderNumber} className="flex items-center gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => void runTrack(o.orderNumber, o.phone)}
                  className="min-w-0 flex-1 text-left"
                  title={t('track.button')}
                >
                  <p className="font-mono text-sm font-bold hover:text-flame">{o.orderNumber}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(o.savedAt)}{o.total != null ? ` · ${formatPrice(o.total)}` : ''}
                  </p>
                </button>
                {o.status && <StatusPill status={o.status} paymentStatus={o.status === 'DELIVERED' ? 'VERIFIED' : o.status === 'CANCELLED' ? 'REJECTED' : 'PENDING'} />}
                <button
                  type="button"
                  onClick={() => setSaved(removeSavedOrder(o.orderNumber))}
                  aria-label={t('track.removeOrder')}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">{t('track.savedHint')}</p>
        </section>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void runTrack(orderNumber, phone) }} className="mx-auto mt-7 grid max-w-xl gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="on" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('track.orderNumber')}</label>
          <Input id="on" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-2026-48291" className="mt-1.5 font-mono" required />
        </div>
        <div>
          <label htmlFor="ph" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('track.phone')}</label>
          <Input id="ph" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251 9XX XXX XXX" className="mt-1.5" required />
        </div>
        <Button type="submit" disabled={busy} className="rounded-full bg-ink px-6 text-xs uppercase tracking-wider hover:bg-flame">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('track.button')}
        </Button>
      </form>

      <p className="mx-auto mt-3 max-w-xl text-center text-[11px] text-muted-foreground">
        {t('track.signInHint')} <Link href="/account" className="font-bold underline underline-offset-2 hover:text-flame">{t('nav.signIn')}</Link>
      </p>

      {error && (
        <div className="mx-auto mt-6 max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center">
          <p className="text-sm font-bold text-destructive">{t('track.notFound')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('track.notFoundText')}
          </p>
          <Link href="/contact" className="mt-3 inline-block"><Button variant="outline" size="sm" className="rounded-full text-xs uppercase tracking-wider"><LifeBuoy className="mr-1.5 h-3.5 w-3.5" /> {t('nav.contact')}</Button></Link>
        </div>
      )}

      {order && <TrackResult order={order} />}
    </div>
  )
}

function TrackResult({ order }: { order: TrackedOrder }) {
  const { t, lang } = useLang()
  const cancelled = order.status === 'CANCELLED'
  const stages = ORDER_TIMELINE
  const currentIdx = stages.findIndex((s) => s.key === order.status)
  const idx = order.status === 'READY_FOR_DELIVERY' ? 2 : currentIdx === -1 ? 0 : currentIdx

  return (
    <div className="mx-auto mt-8 max-w-xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('payment.order')}</p>
            <p className="font-mono text-xl font-bold">{order.orderNumber}</p>
          </div>
          <StatusPill status={order.status} paymentStatus={order.paymentStatus} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t('status.ORDER_PLACED')} · {formatDateTime(order.createdAt)}</p>

        {cancelled ? (
          <div className="mt-5 rounded-xl bg-destructive/5 p-4 text-sm">
            <p className="font-bold text-destructive">{t('status.CANCELLED')}</p>
            {order.rejectionReason ? <p className="mt-1 text-foreground/80">{pickReason(order, lang)}</p> : null}
            <p className="mt-1 text-xs text-muted-foreground">{t('payment.rejectedHint')}</p>
          </div>
        ) : (
          <ol className="mt-6 space-y-0">
            {stages.map((s, i) => {
              const isDone = i < idx
              const isCurrent = i === idx
              return (
                <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0">
                  {i < stages.length - 1 && (
                    <span className={cn('absolute left-[11px] top-6 h-full w-0.5', isDone ? 'bg-[#4a7c59]' : 'bg-border')} />
                  )}
                  <span
                    className={cn(
                      'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                      isDone ? 'border-[#4a7c59] bg-[#4a7c59] text-white' : isCurrent ? 'border-flame bg-flame text-white' : 'border-border bg-card'
                    )}
                  >
                    {isDone ? <CircleCheckBig className="h-3.5 w-3.5" /> : isCurrent ? <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> : null}
                  </span>
                  <div>
                    <p className={cn('text-sm font-bold', isCurrent ? 'text-flame' : isDone ? 'text-foreground' : 'text-muted-foreground')}>
                      {t(`status.${s.key}`)}
                      {isCurrent && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider">{t('track.currentStage')}</span>}
                    </p>
                    {isCurrent && order.estimatedDelivery ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{order.estimatedDelivery}</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* payment status */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('track.payment')}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className={cn(
            'text-sm font-bold',
            order.paymentStatus === 'VERIFIED' && 'text-[#4a7c59]',
            order.paymentStatus === 'REJECTED' && 'text-destructive',
            order.paymentStatus === 'PENDING' && 'text-[#b8a038]'
          )}>
            {t(`paystatus.${order.paymentStatus}`)}
          </p>
          {order.payment?.methodName && <p className="text-xs text-muted-foreground">{t('track.via')} {order.payment.methodName}</p>}
        </div>
        {order.paymentStatus === 'PENDING' && (
          <p className="mt-2 text-xs text-muted-foreground">{t('track.pendingNote')}</p>
        )}
        {order.paymentStatus === 'REJECTED' && order.payment?.rejectionReason && (
          <div className="mt-3 rounded-lg bg-destructive/5 p-3 text-xs leading-relaxed">
            <p className="font-bold text-destructive">{t('payment.rejectedReason', { reason: pickReason(order.payment, lang) })}</p>
            <p className="mt-1 text-muted-foreground">{t('payment.rejectedHint')}</p>
          </div>
        )}
        {order.payment?.transactionRef && (
          <p className="mt-2 text-xs text-muted-foreground">{t('track.ref')}: <span className="font-mono">{order.payment.transactionRef}</span></p>
        )}
      </div>

      {/* items */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('track.items')}</p>
        <ul className="mt-3 space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-secondary">
                {item.image ? <SafeImage src={item.image} alt={item.name} fill sizes="44px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.qty} × {item.size} · {item.color}</p>
              </div>
              <p className="text-sm font-semibold">{formatPrice(item.price * item.qty)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">{t('cart.subtotal')}</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">{t('checkout.delivery')}</dt><dd>{formatPrice(order.deliveryFee)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between text-[#4a7c59]"><dt>{t('checkout.discount')}</dt><dd>-{formatPrice(order.discount)}</dd></div>}
          <div className="flex justify-between border-t border-border pt-2 font-bold"><dt>{t('payment.total')}</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Delivering to: {order.city} — {order.address}</p>
      </div>

      {/* store updates the admin sent for this order */}
      {(order.updates?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('track.updates')}</p>
          <ul className="mt-3 space-y-3">
            {order.updates!.map((u, i) => {
              const msg = lang === 'am' ? (u.messageAm ?? u.message) : (u.messageEn ?? u.message)
              return (
                <li key={i} className="border-l-2 border-[#4a7c59]/40 pl-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <p className="text-sm font-bold">{t(`status.${u.status}`)}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(u.createdAt)}</p>
                  </div>
                  {msg && <p className="mt-0.5 text-xs leading-relaxed text-foreground/80">{msg}</p>}
                  {u.trackingCode && (
                    <p className="mt-1 text-xs text-muted-foreground">{t('track.trackingCode')}: <span className="font-mono font-bold text-foreground">{u.trackingCode}</span></p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="text-center">
        <Link href="/contact"><Button variant="outline" className="rounded-full text-xs uppercase tracking-wider"><LifeBuoy className="mr-1.5 h-4 w-4" /> Questions about this order? Contact us</Button></Link>
      </div>
    </div>
  )
}

function StatusPill({ status, paymentStatus }: { status: string; paymentStatus: string }) {
  const { t } = useLang()
  const label = t(`status.${status}`)
  const tone =
    status === 'DELIVERED' || paymentStatus === 'VERIFIED'
      ? 'bg-[#4a7c59]/10 text-[#4a7c59]'
      : status === 'CANCELLED' || paymentStatus === 'REJECTED'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-[#b8a038]/10 text-[#b8a038]'
  return <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider', tone)}>{label}</span>
}

export function TrackPageClient() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <TrackClient />
    </Suspense>
  )
}
