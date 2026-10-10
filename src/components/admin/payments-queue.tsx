'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle, Eye, Copy, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatPrice, formatDateTime } from '@/lib/shared'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLang } from '@/lib/i18n'

type PaymentRow = {
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
  order: {
    id: string
    orderNumber: string
    customerName: string
    phone: string
    total: number
    status: string
    createdAt: string
    items: { name: string; qty: number; size: string; color: string }[]
  }
}

const TABS = [
  { key: 'PENDING', labelKey: 'admin.pay.tabPending' },
  { key: 'VERIFIED', labelKey: 'admin.pay.tabVerified' },
  { key: 'REJECTED', labelKey: 'admin.pay.tabRejected' },
  { key: '', labelKey: 'admin.pay.tabAll' },
]

export function AdminPayments() {
  const { t } = useLang()
  const [tab, setTab] = useState('PENDING')
  const [payments, setPayments] = useState<PaymentRow[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [zoom, setZoom] = useState<string | null>(null)

  const load = useCallback(() => {
    const params = tab ? `?status=${tab}` : ''
    fetch(`/api/admin/payments${params}`)
      .then((r) => r.json())
      .then((d) => setPayments(d.payments ?? []))
      .catch(() => setPayments([]))
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  async function act(id: string, action: 'APPROVE' | 'REJECT', rejectReason?: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: rejectReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('admin.failed'))
      toast.success(action === 'APPROVE' ? t('admin.pay.approvedToast') : t('admin.pay.rejectedToast'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.failed'))
    } finally {
      setBusyId(null)
    }
  }

  async function reject() {
    if (!rejectId) return
    if (reason.trim().length < 3) return toast.error(t('admin.pay.reasonRequired'))
    await act(rejectId, 'REJECT', reason.trim())
    setRejectId(null)
    setReason('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tight">{t('admin.pay.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.pay.sub')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={cn(
              'rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors',
              tab === tb.key ? 'border-ink bg-ink text-cream' : 'border-border bg-card hover:border-ink'
            )}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {payments === null ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-lg uppercase">{t('admin.pay.nothing')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === 'PENDING' ? t('admin.pay.emptyPending') : t('admin.pay.emptyOther')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {payments.map((p) => (
            <article key={p.id} className={cn(
              'rounded-2xl border bg-card p-5',
              p.status === 'PENDING' ? 'border-[#b8a038]/50' : p.status === 'VERIFIED' ? 'border-[#4a7c59]/40' : 'border-destructive/30'
            )}>
              <div className="flex gap-4">
                {/* screenshot */}
                <div className="relative h-40 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
                  {p.screenshotPath ? (
                    <>
                      <Image src={`/api/files/payments/${p.screenshotPath}`} alt={t('admin.pay.screenshot')} fill sizes="128px" className="object-cover" unoptimized={true} />
                      <button
                        onClick={() => setZoom(p.screenshotPath!)}
                        className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                        aria-label={t('admin.pay.viewFull')}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center"><ImageOff className="h-5 w-5 text-muted-foreground" /></div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/orders/${p.order.id}`} className="font-mono text-xs font-bold hover:text-flame hover:underline">{p.order.orderNumber}</Link>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                      p.status === 'PENDING' ? 'bg-[#b8a038]/15 text-[#b8a038]' : p.status === 'VERIFIED' ? 'bg-[#4a7c59]/15 text-[#4a7c59]' : 'bg-destructive/10 text-destructive'
                    )}>
                      {t('paystatus.' + p.status)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-lg font-bold">{formatPrice(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">{t('admin.pay.payer', { method: p.methodName, payer: p.payerName })}</p>
                  <p className="mt-1 flex items-center gap-1 font-mono text-xs">
                    {p.transactionRef}
                    <button onClick={() => { navigator.clipboard.writeText(p.transactionRef); toast.success(t('admin.pay.refCopied')) }} aria-label={t('admin.pay.copyRef')}><Copy className="h-3 w-3" /></button>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.order.customerName} · {p.order.phone} · {t('admin.items', { count: p.order.items.reduce((n, i) => n + i.qty, 0) })} · {formatDateTime(p.createdAt)}
                  </p>
                  {p.status === 'REJECTED' && p.rejectionReason && (
                    <p className="mt-1.5 rounded bg-destructive/5 px-2 py-1 text-[11px] text-destructive">{t('admin.pay.reasonPrefix', { reason: p.rejectionReason })}</p>
                  )}
                  {p.status === 'VERIFIED' && p.reviewedBy && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">{t('admin.pay.approvedBy', { name: p.reviewedBy })}</p>
                  )}
                </div>
              </div>

              {p.status === 'PENDING' && (
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <Button
                    onClick={() => act(p.id, 'APPROVE')}
                    disabled={busyId === p.id}
                    className="flex-1 rounded-full bg-[#4a7c59] text-xs uppercase tracking-wider hover:bg-[#3a6447]"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> {t('admin.pay.approve')}
                  </Button>
                  <Button
                    onClick={() => setRejectId(p.id)}
                    disabled={busyId === p.id}
                    variant="outline"
                    className="flex-1 rounded-full border-destructive/50 text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5"
                  >
                    <XCircle className="mr-1.5 h-4 w-4" /> {t('admin.pay.reject')}
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={(v) => (v ? undefined : setRejectId(null))}>
        <DialogContent className="sm:max-w-md">
          <h3 className="font-display text-lg uppercase">{t('admin.pay.rejectTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('admin.pay.rejectInfo')}</p>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('admin.pay.rejectPlaceholder')} />
          <Button onClick={reject} className="w-full rounded-full bg-destructive text-xs uppercase tracking-wider hover:bg-destructive/90">{t('admin.pay.rejectBtn')}</Button>
        </DialogContent>
      </Dialog>

      {/* zoom */}
      <Dialog open={!!zoom} onOpenChange={(v) => (v ? undefined : setZoom(null))}>
        <DialogContent className="max-h-[92vh] overflow-y-auto thin-scrollbar p-0 sm:max-w-2xl">
          {zoom && (
            <div className="relative min-h-[50vh] w-full">
              <Image src={`/api/files/payments/${zoom}`} alt={t('admin.pay.screenshot')} fill sizes="700px" className="object-contain" unoptimized={true} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
