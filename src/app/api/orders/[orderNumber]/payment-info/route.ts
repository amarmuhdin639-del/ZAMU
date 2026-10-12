import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { translateRejection } from '@/lib/translate-rejection'

// Minimal public order info for the payment page (no address / customer details)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await ctx.params
  const order = await db.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    select: {
      orderNumber: true,
      total: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
      payment: {
        select: {
          id: true,
          status: true,
          methodName: true,
          transactionRef: true,
          payerName: true,
          rejectionReason: true,
          rejectionReasonEn: true,
          rejectionReasonAm: true,
        },
      },
      items: { select: { name: true, image: true, qty: true, size: true, color: true, price: true } },
    },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // legacy rejected payments have no translations yet — backfill once and persist
  const p = order.payment
  if (p?.rejectionReason && !p.rejectionReasonEn && !p.rejectionReasonAm && p.id) {
    try {
      const tr = await translateRejection(p.rejectionReason)
      if (tr) {
        await db.payment.update({
          where: { id: p.id },
          data: { rejectionReasonEn: tr.en, rejectionReasonAm: tr.am },
        })
        await db.order.update({
          where: { orderNumber: order.orderNumber },
          data: { rejectionReasonEn: tr.en, rejectionReasonAm: tr.am },
        })
        p.rejectionReasonEn = tr.en
        p.rejectionReasonAm = tr.am
      }
    } catch (e) {
      console.error('reason translation backfill failed', e)
    }
  }

  // strip the internal id again — not part of the public payload
  if (p) delete (p as { id?: string }).id
  return NextResponse.json({ order: { ...order, payment: p } })
}
