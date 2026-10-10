'use client'

import { useRef, useState } from 'react'
import { SafeImage } from './media-box'
import Link from 'next/link'
import { Copy, Check, UploadCloud, ShieldCheck, CircleCheckBig, PartyPopper, Info } from 'lucide-react'
import { formatPrice } from '@/lib/shared'
import { useLang } from '@/lib/i18n'
import { pickReason } from '@/lib/reason'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type OrderInfo = {
  orderNumber: string
  total: number
  subtotal: number
  deliveryFee: number
  discount: number
  paymentStatus: string
  payment: { status: string; methodName: string; transactionRef: string; rejectionReason: string | null; rejectionReasonEn?: string | null; rejectionReasonAm?: string | null } | null
  items: { name: string; image: string | null; qty: number; size: string; color: string; price: number }[]
}

type Method = { id: string; name: string; accountNumber: string; accountName: string; phone: string | null; instructions: string | null }

const STEPS = ['payment.stepSelect', 'payment.stepConfirm', 'payment.stepDone'] as const

export function PaymentFlow({ order, methods }: { order: OrderInfo; methods: Method[] }) {
  const { t, lang } = useLang()
  const [step, setStep] = useState(0)
  const [methodId, setMethodId] = useState('')
  const [copied, setCopied] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [ref, setRef] = useState('')
  const [payerName, setPayerName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const method = methods.find((m) => m.id === methodId)
  const rejected = order.paymentStatus === 'REJECTED'

  // ---- already verified ----
  if (!done && order.paymentStatus === 'VERIFIED') {
    return (
      <div className="mt-10 flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4a7c59]/10">
          <CircleCheckBig className="h-7 w-7 text-[#4a7c59]" />
        </div>
        <h2 className="mt-5 font-display text-3xl uppercase">{t('payment.verifiedTitle')}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {t('payment.verifiedText', { order: order.orderNumber })}
        </p>
        <Link href={`/track?orderNumber=${order.orderNumber}`}>
          <Button className="mt-6 rounded-full bg-ink px-7 text-xs uppercase tracking-wider hover:bg-flame">{t('nav.trackOrder')}</Button>
        </Link>
      </div>
    )
  }

  // ---- success screen (only when a payment confirmation was actually submitted) ----
  if (done || (!rejected && order.payment?.status === 'PENDING')) {
    return <SuccessScreen orderNumber={order.orderNumber} resubmit={!done && !!order.payment} />
  }

  function pickMethod(m: Method) {
    setMethodId(m.id)
    setStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function copyAccount() {
    if (!method) return
    try {
      await navigator.clipboard.writeText(method.accountNumber)
      setCopied(true)
      toast.success(t('payment.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed — please copy manually')
    }
  }

  function onFile(f: File | null) {
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      toast.error('Screenshot must be JPG, PNG or WEBP')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Screenshot is too large (max 5MB)')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submitPayment() {
    if (!method) return
    if (!file) return toast.error('Please attach the payment screenshot')
    if (ref.trim().length < 3) return toast.error('Enter the transaction / reference number')
    if (payerName.trim().length < 2) return toast.error('Enter the payer name')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('screenshot', file)
      fd.append('methodName', method.name)
      fd.append('transactionRef', ref.trim())
      fd.append('payerName', payerName.trim())
      fd.append('amount', String(order.total))
      const res = await fetch(`/api/orders/${order.orderNumber}/payment`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not submit payment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-8">
      {rejected && order.payment?.rejectionReason && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-destructive">
            <Info className="h-4 w-4" /> {t('payment.rejectedNotice')}
          </p>
          <p className="mt-1 text-sm text-foreground/80">{t('payment.rejectedReason', { reason: pickReason(order.payment, lang) })}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('payment.rejectedHint')}</p>
        </div>
      )}

      {/* step header */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {STEPS.map((key, i) => (
          <div
            key={key}
            className={cn(
              'rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-wider',
              step === i ? 'border-ink bg-ink text-cream' : step > i ? 'border-[#4a7c59]/40 bg-[#4a7c59]/10 text-[#4a7c59]' : 'border-border text-muted-foreground'
            )}
          >
            {i + 1}. {t(key)}
          </div>
        ))}
      </div>

      {/* STEP 0 — choose method */}
      {step === 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl uppercase">{t('payment.chooseMethod')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('payment.chooseMethodText')}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {methods.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground sm:col-span-2">
                {t('payment.noMethods')}
              </div>
            )}
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => pickMethod(m)}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-ink hover:shadow-md"
              >
                <span>
                  <span className="block font-display text-lg uppercase">{m.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{m.accountName}</span>
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <ShieldCheck className="h-5 w-5 text-flame" />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 1 — pay & confirm */}
      {step === 1 && method && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section>
            <button onClick={() => setStep(0)} className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
              {t('payment.changeMethod')}
            </button>
            <div className="rounded-2xl border-2 border-ink bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl uppercase">{method.name}</h2>
                <span className="rounded-full bg-flame/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-flame">Step 2</span>
              </div>
              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('payment.accountNumber')}</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <code className="rounded-lg bg-secondary px-4 py-3 font-mono text-xl font-bold tracking-wider">{method.accountNumber}</code>
                    <button
                      onClick={copyAccount}
                      className={cn(
                        'flex h-11 items-center gap-1.5 rounded-full px-4 text-[11px] font-bold uppercase tracking-wider transition-colors',
                        copied ? 'bg-[#4a7c59] text-white' : 'bg-ink text-cream hover:bg-flame'
                      )}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? t('payment.copied') : t('payment.copy')}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('payment.accountName')}</dt>
                  <dd className="mt-0.5 font-bold">{method.accountName}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('payment.amountToPay')}</dt>
                  <dd className="mt-0.5 font-display text-3xl text-flame">{formatPrice(order.total)}</dd>
                </div>
                {method.instructions ? (
                  <div className="rounded-lg bg-secondary/70 p-3 text-xs leading-relaxed text-muted-foreground">{method.instructions}</div>
                ) : null}
              </dl>
            </div>

            {/* proof upload */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg uppercase">{t('payment.confirmTitle')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('payment.confirmText')}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="payer">{t('payment.payerName')} *</Label>
                  <Input id="payer" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="e.g. Abebe Kebede" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="ref">{t('payment.transactionRef')} *</Label>
                  <Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t('payment.refPlaceholder')} className="mt-1.5" />
                </div>
              </div>
              <div className="mt-4">
                <Label>{t('payment.screenshot')} *</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
                {preview ? (
                  <div className="mt-2 flex items-center gap-4 rounded-xl border border-border p-3">
                    <img src={preview} alt="Payment screenshot preview" className="h-24 w-20 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{file?.name}</p>
                      <p className="text-xs text-muted-foreground">{file ? `${(file.size / 1024).toFixed(0)} KB` : ''}</p>
                      <button onClick={() => { setFile(null); setPreview(null) }} className="mt-1 text-xs font-bold uppercase tracking-wider text-destructive hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="mt-2 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 px-4 py-8 transition-colors hover:border-ink"
                  >
                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-semibold">{t('payment.tapToUpload')}</span>
                    <span className="text-xs text-muted-foreground">{t('payment.uploadHint')}</span>
                  </button>
                )}
              </div>
              <Button onClick={submitPayment} disabled={busy} className="mt-5 w-full rounded-full bg-flame py-6 text-xs font-bold uppercase tracking-[0.14em] hover:bg-flame-dark disabled:opacity-50">
                {busy ? t('payment.submitting') : t('payment.submit')}
              </Button>
              <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-flame" />
                {t('payment.privacyNote')}
              </p>
            </div>
          </section>

          {/* order summary */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('payment.order')}</p>
              <p className="font-display text-xl">{order.orderNumber}</p>
              <ul className="mt-4 space-y-3">
                {order.items.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-secondary">
                      {item.image ? <SafeImage src={item.image} alt={item.name} fill sizes="44px" className="object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.qty} × {item.size} · {item.color}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">{t('cart.subtotal')}</dt><dd>{formatPrice(order.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{t('checkout.delivery')}</dt><dd>{formatPrice(order.deliveryFee)}</dd></div>
                {order.discount > 0 && <div className="flex justify-between text-[#4a7c59]"><dt>{t('checkout.discount')}</dt><dd>-{formatPrice(order.discount)}</dd></div>}
                <div className="flex justify-between border-t border-border pt-2 font-bold"><dt>{t('payment.total')}</dt><dd>{formatPrice(order.total)}</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function SuccessScreen({ orderNumber, resubmit }: { orderNumber: string; resubmit?: boolean }) {
  const { t } = useLang()
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4a7c59]/10">
        <PartyPopper className="h-7 w-7 text-[#4a7c59]" />
      </div>
      <h2 className="mt-5 font-display text-3xl uppercase">{t('payment.submittedTitle')}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t('payment.submittedText')}
      </p>
      <div className="mt-6 rounded-xl bg-secondary px-6 py-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('payment.keepOrderNumber')}</p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-wider">{orderNumber}</p>
      </div>
      <p className="mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">{t('payment.savedOnDevice')}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href={`/track?orderNumber=${orderNumber}`}>
          <Button className="rounded-full bg-ink px-7 text-xs uppercase tracking-wider hover:bg-flame">
            <CircleCheckBig className="mr-1.5 h-4 w-4" /> {t('payment.trackThisOrder')}
          </Button>
        </Link>
        <Link href="/shop">
          <Button variant="outline" className="rounded-full px-7 text-xs uppercase tracking-wider">{t('payment.continueShopping')}</Button>
        </Link>
      </div>
    </div>
  )
}
