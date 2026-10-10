'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Eye, Copy, Truck, BellRing, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatPrice, formatDateTime } from '@/lib/shared'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLang } from '@/lib/i18n'
import { MediaBox } from '@/components/store/media-box'

// the fulfillment ladder shown to the admin (CANCELLED handled separately)
const FULFILLMENT_STEPS = ['PAYMENT_VERIFIED', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const

type OrderDetail = {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  email: string | null
  city: string
  address: string
  notes: string | null
  telegram: string | null
  whatsapp: string | null
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  discountCode: string | null
  status: string
  paymentStatus: string
  adminNotes: string | null
  rejectionReason: string | null
  estimatedDelivery: string | null
  createdAt: string
  items: { id: string; name: string; image: string | null; price: number; qty: number; size: string; color: string }[]
  payment: {
    id: string
    methodName: string
    transactionRef: string
    payerName: string
    screenshotPath: string | null
    amount: number
    status: string
    reviewedBy: string | null
    reviewedAt: string | null
    rejectionReason: string | null
    createdAt: string
  } | null
  user: { name: string; phone: string; email: string | null } | null
  deliveryZone: { name: string; fee: number } | null
  updates?: {
    id: string
    status: string
    message: string | null
    messageEn: string | null
    messageAm: string | null
    trackingCode: string | null
    informed: boolean
    createdAt: string
  }[]
}

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const { t } = useLang()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [eta, setEta] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [zoom, setZoom] = useState(false)
  // fulfillment step form
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [stepNote, setStepNote] = useState('')
  const [stepTracking, setStepTracking] = useState('')
  const [inform, setInform] = useState(true)

  const load = useCallback(() => {
    fetch(`/api/admin/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.order) {
          setOrder(d.order)
          setNotes(d.order.adminNotes ?? '')
          setEta(d.order.estimatedDelivery ?? '')
        }
      })
      .catch(() => {})
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  async function update(body: Record<string, unknown>, successMsg: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('admin.ord.updateFailed'))
      toast.success(successMsg)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.ord.updateFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function approvePayment() {
    if (!order?.payment) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/payments/${order.payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('admin.ord.approveFailed'))
      toast.success(t('admin.ord.approveToast'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.ord.approveFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function rejectPayment() {
    if (!order?.payment) return
    if (reason.trim().length < 3) return toast.error(t('admin.ord.reasonRequired'))
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/payments/${order.payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('admin.ord.rejectFailed'))
      toast.success(t('admin.ord.rejectToast'))
      setRejectOpen(false)
      setReason('')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.ord.rejectFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function submitStep() {
    if (!pendingStatus) return
    await update(
      {
        status: pendingStatus,
        note: stepNote.trim(),
        trackingCode: stepTracking.trim(),
        informCustomer: inform,
      },
      inform ? t('admin.ord.updateSent') : t('admin.ord.statusChanged', { status: t('status.' + pendingStatus) })
    )
    setPendingStatus(null)
    setStepNote('')
    setStepTracking('')
    setInform(true)
  }

  if (!order) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  const updates = order.updates ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="rounded-full border border-border bg-card p-2 hover:border-ink" aria-label={t('admin.ord.back')}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-mono text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-xs text-muted-foreground">{t('admin.ord.placed', { date: formatDateTime(order.createdAt) })}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <span className={cn(
            'rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider',
            order.paymentStatus === 'VERIFIED' ? 'bg-[#4a7c59]/10 text-[#4a7c59]' : order.paymentStatus === 'REJECTED' ? 'bg-destructive/10 text-destructive' : 'bg-[#b8a038]/10 text-[#b8a038]'
          )}>
            {t('admin.ord.paymentStatus', { status: t('paystatus.' + order.paymentStatus) })}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider">
            {t('status.' + order.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* items */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg uppercase">{t('admin.ord.items')}</h2>
            <ul className="mt-4 space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                    {item.image ? <MediaBox src={item.image} alt={item.name} sizes="48px" className="object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{t('admin.ord.sizeColorQty', { size: item.size, color: item.color, qty: item.qty })}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(item.price * item.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('admin.ord.subtotal')}</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('admin.ord.delivery', { zone: order.deliveryZone ? `(${order.deliveryZone.name})` : '' })}</dt><dd>{formatPrice(order.deliveryFee)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-[#4a7c59]"><dt>{t('admin.ord.discount', { code: order.discountCode ? `(${order.discountCode})` : '' })}</dt><dd>-{formatPrice(order.discount)}</dd></div>}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>{t('admin.ord.total')}</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
          </section>

          {/* payment verification */}
          <section className={cn(
            'rounded-2xl border-2 bg-card p-5',
            order.paymentStatus === 'VERIFIED' ? 'border-[#4a7c59]/40' : order.paymentStatus === 'REJECTED' ? 'border-destructive/40' : 'border-[#b8a038]/50'
          )}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg uppercase">{t('admin.ord.verification')}</h2>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('admin.ord.manualNote')}
              </span>
            </div>

            {order.payment ? (
              <>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('admin.ord.method')}</p><p className="font-semibold">{order.payment.methodName}</p></div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('admin.ord.ref')}</p>
                    <p className="flex items-center gap-1.5 font-mono font-semibold">
                      {order.payment.transactionRef}
                      <button onClick={() => { navigator.clipboard.writeText(order.payment!.transactionRef); toast.success(t('admin.pay.refCopied')) }} aria-label={t('admin.pay.copyRef')}><Copy className="h-3 w-3" /></button>
                    </p>
                  </div>
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('admin.ord.payerName')}</p><p className="font-semibold">{order.payment.payerName}</p></div>
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('admin.ord.amount')}</p><p className="font-semibold">{formatPrice(order.payment.amount)}</p></div>
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('admin.ord.submitted')}</p><p className="font-semibold">{formatDateTime(order.payment.createdAt)}</p></div>
                  {order.payment.reviewedBy && (
                    <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('admin.ord.reviewedBy')}</p><p className="font-semibold">{order.payment.reviewedBy} · {order.payment.reviewedAt ? formatDateTime(order.payment.reviewedAt) : ''}</p></div>
                  )}
                </div>

                {order.payment.screenshotPath && (
                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('admin.ord.screenshotPrivate')}</p>
                    <div className="relative mt-2 inline-block h-64 w-48 overflow-hidden rounded-xl border border-border bg-secondary">
                      <Image src={`/api/files/payments/${order.payment.screenshotPath}`} alt={t('admin.pay.screenshot')} fill sizes="192px" className="object-cover" unoptimized={true} />
                    </div>
                    <button onClick={() => setZoom(true)} className="ml-2 align-top text-xs font-bold uppercase tracking-wider text-flame hover:underline">
                      <Eye className="mr-1 inline h-3.5 w-3.5" />{t('admin.pay.viewFull')}
                    </button>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {order.payment.status !== 'VERIFIED' && (
                    <Button onClick={approvePayment} disabled={busy} className="rounded-full bg-[#4a7c59] text-xs uppercase tracking-wider hover:bg-[#3a6447]">
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> {t('admin.ord.approvePayment')}
                    </Button>
                  )}
                  {order.payment.status !== 'REJECTED' && (
                    <Button onClick={() => setRejectOpen(true)} disabled={busy} variant="outline" className="rounded-full border-destructive/50 text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5">
                      <XCircle className="mr-1.5 h-4 w-4" /> {t('admin.ord.rejectPayment')}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                {t('admin.ord.noPayment')}
              </div>
            )}
          </section>
        </div>

        {/* right column */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg uppercase">{t('admin.ord.customer')}</h2>
            <div className="mt-3 space-y-1.5 text-sm">
              <p className="font-bold">{order.customerName}</p>
              <p className="text-muted-foreground">{order.phone}</p>
              {order.email && <p className="text-muted-foreground">{order.email}</p>}
              {order.telegram && <p className="text-muted-foreground">{t('admin.ord.telegram', { handle: order.telegram })}</p>}
              {order.whatsapp && <p className="text-muted-foreground">{t('admin.ord.whatsapp', { number: order.whatsapp })}</p>}
              <p className="pt-2 font-semibold">{t('admin.ord.address')}</p>
              <p className="text-muted-foreground">{order.city} — {order.address}</p>
              {order.notes && <p className="pt-1"><span className="font-semibold">{t('admin.ord.notes')}</span> <span className="text-muted-foreground">{order.notes}</span></p>}
            </div>
            <div className="mt-4 flex gap-2">
              <a href={`tel:${order.phone}`} className="flex-1 rounded-full border border-border py-2.5 text-center text-[11px] font-bold uppercase tracking-wider hover:border-ink">{t('admin.ord.call')}</a>
              {order.whatsapp && (
                <a href={`https://wa.me/${order.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex-1 rounded-full border border-border py-2.5 text-center text-[11px] font-bold uppercase tracking-wider hover:border-ink">WhatsApp</a>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg uppercase">{t('admin.ord.fulfillment')}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t('admin.ord.advanceHint')}</p>

            {/* fulfillment stepper */}
            <ol className="mt-4 space-y-0">
              {FULFILLMENT_STEPS.map((s, i) => {
                const doneIdx = FULFILLMENT_STEPS.indexOf(order.status as typeof FULFILLMENT_STEPS[number])
                const isDone = doneIdx !== -1 && i < doneIdx
                const isCurrent = order.status === s
                const isSelected = pendingStatus === s
                return (
                  <li key={s} className="relative flex gap-3">
                    {i < FULFILLMENT_STEPS.length - 1 && (
                      <span className={cn('absolute left-[10px] top-6 h-full w-0.5', isDone ? 'bg-[#4a7c59]' : 'bg-border')} />
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => { setPendingStatus(isSelected ? null : s); setStepNote(''); setStepTracking('') }}
                      className="relative z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                      aria-label={t('status.' + s)}
                    >
                      <span className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border-2',
                        isSelected ? 'border-flame bg-flame text-white'
                          : isDone ? 'border-[#4a7c59] bg-[#4a7c59] text-white'
                          : isCurrent ? 'border-flame bg-flame text-white'
                          : 'border-border bg-card'
                      )}>
                        {isDone ? <CheckCircle2 className="h-3 w-3" /> : (isCurrent || isSelected) ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> : null}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => { setPendingStatus(isSelected ? null : s); setStepNote(''); setStepTracking('') }}
                      className={cn(
                        'flex-1 rounded-lg px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide transition-colors',
                        isSelected ? 'bg-flame/10 text-flame' : isCurrent ? 'text-flame' : isDone ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {t('status.' + s)}
                      {isCurrent && <span className="ml-2 text-[10px]">●</span>}
                    </button>
                  </li>
                )
              })}
            </ol>

            {/* step update form */}
            {pendingStatus && pendingStatus !== 'CANCELLED' && (
              <div className="mt-4 space-y-3 rounded-xl border border-flame/30 bg-flame/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-flame">
                  {t('admin.ord.nextStep', { status: t('status.' + pendingStatus) })}
                </p>
                <div>
                  <Label htmlFor="stepNote">{t('admin.ord.noteToCustomer')}</Label>
                  <Textarea id="stepNote" rows={2} value={stepNote} onChange={(e) => setStepNote(e.target.value)} placeholder={t('admin.ord.notePlaceholder')} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="stepTrk">{t('admin.ord.trackingCode')}</Label>
                  <Textarea id="stepTrk" rows={1} value={stepTracking} onChange={(e) => setStepTracking(e.target.value)} placeholder={t('admin.ord.trackingPlaceholder')} className="mt-1.5" />
                </div>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" checked={inform} onChange={(e) => setInform(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#e0401f]" />
                  <span>
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                      {inform ? <BellRing className="h-3.5 w-3.5 text-flame" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      {t('admin.ord.informOrderer')}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{t('admin.ord.informHint')}</span>
                  </span>
                </label>
                <div className="flex gap-2">
                  <Button onClick={submitStep} disabled={busy} className="flex-1 rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame">
                    <Truck className="mr-1.5 h-4 w-4" /> {t('admin.ord.updateStep')}
                  </Button>
                  <Button onClick={() => setPendingStatus(null)} disabled={busy} variant="outline" className="rounded-full text-xs uppercase tracking-wider">
                    {t('admin.form.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {/* cancel — destructive, outside the stepper */}
            {order.status !== 'CANCELLED' && (
              <button
                disabled={busy}
                onClick={() => update({ status: 'CANCELLED', informCustomer: true }, t('admin.ord.statusChanged', { status: t('status.CANCELLED') }))}
                className="mt-4 w-full rounded-full border border-destructive/40 py-2 text-[11px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/5 disabled:opacity-40"
              >
                {t('status.CANCELLED')}
              </button>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">{t('admin.ord.cancelStockNote')}</p>

            {/* updates already sent */}
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('admin.ord.updatesSent')}</p>
              {updates.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">{t('admin.ord.noUpdates')}</p>
              ) : (
                <ul className="mt-2 space-y-2.5">
                  {updates.map((u) => (
                    <li key={u.id} className="rounded-lg bg-secondary/60 p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-bold">{t('status.' + u.status)}</span>
                        <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', u.informed ? 'bg-[#4a7c59]/10 text-[#4a7c59]' : 'bg-muted text-muted-foreground')}>
                          {u.informed ? <BellRing className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                          {u.informed ? t('admin.ord.informed') : t('admin.ord.silent')}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(u.createdAt)}</p>
                      {u.message && <p className="mt-1 leading-relaxed">{u.message}</p>}
                      {u.trackingCode && <p className="mt-1 font-mono text-[11px]">{t('track.trackingCode')}: {u.trackingCode}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg uppercase">{t('admin.ord.notesEta')}</h2>
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="eta">{t('admin.ord.etaLabel')}</Label>
                <Textarea id="eta" rows={1} value={eta} onChange={(e) => setEta(e.target.value)} placeholder={t('admin.ord.etaPlaceholder')} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="anotes">{t('admin.ord.internalNotes')}</Label>
                <Textarea id="anotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('admin.ord.notesPlaceholder')} className="mt-1.5" />
              </div>
              <Button
                onClick={() => update({ adminNotes: notes, estimatedDelivery: eta }, t('admin.ord.notesSaved'))}
                disabled={busy}
                className="w-full rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame"
              >
                {t('admin.ord.saveNotes')}
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <h3 className="font-display text-lg uppercase">{t('admin.pay.rejectTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('admin.ord.rejectInfo')}
          </p>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('admin.ord.rejectPlaceholder')} />
          <Button onClick={rejectPayment} disabled={busy} className="w-full rounded-full bg-destructive text-xs uppercase tracking-wider hover:bg-destructive/90">
            {busy ? t('admin.ord.rejecting') : t('admin.ord.rejectPayment')}
          </Button>
        </DialogContent>
      </Dialog>

      {/* screenshot zoom */}
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-h-[92vh] overflow-y-auto thin-scrollbar p-0 sm:max-w-2xl">
          {order.payment?.screenshotPath && (
            <div className="relative min-h-[50vh] w-full">
              <Image src={`/api/files/payments/${order.payment.screenshotPath}`} alt={t('admin.pay.screenshot')} fill sizes="700px" className="object-contain" unoptimized={true} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
