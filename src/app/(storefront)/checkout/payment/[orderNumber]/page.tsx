import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PaymentFlow } from '@/components/store/payment-flow'
import { db } from '@/lib/db'

export const metadata: Metadata = { title: 'Payment' }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ orderNumber: string }> }

export default async function PaymentPage({ params }: Props) {
  const { orderNumber } = await params
  const order = await db.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    select: {
      orderNumber: true, total: true, subtotal: true, deliveryFee: true, discount: true, paymentStatus: true,
      payment: { select: { status: true, methodName: true, transactionRef: true, rejectionReason: true, rejectionReasonEn: true, rejectionReasonAm: true } },
      items: { select: { name: true, image: true, qty: true, size: true, color: true, price: true } },
    },
  })
  if (!order) notFound()

  const methods = await db.paymentMethod.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, accountNumber: true, accountName: true, phone: true, instructions: true },
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4a7c59] text-white">✓</span>
        <span>Details</span>
        <span className="h-px w-8 bg-border" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-cream">2</span>
        <span>Payment</span>
        <span className="h-px w-8 bg-border" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground">3</span>
        <span className="text-muted-foreground">Done</span>
      </div>
      <h1 className="font-display text-4xl uppercase tracking-tight">Payment</h1>
      <PaymentFlow order={order} methods={methods} />
    </div>
  )
}
