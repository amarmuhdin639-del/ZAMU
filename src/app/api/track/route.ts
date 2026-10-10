import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { translateRejection } from '@/lib/translate-rejection'

// Order tracking requires BOTH order number and phone number.
export async function GET(req: NextRequest) {
  try {
    const orderNumber = req.nextUrl.searchParams.get('orderNumber')?.trim().toUpperCase() ?? ''
    const phone = req.nextUrl.searchParams.get('phone')?.trim() ?? ''
    if (!orderNumber || !phone) {
      return NextResponse.json({ error: 'Order number and phone number are both required' }, { status: 400 })
    }
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payment: {
          select: {
            status: true,
            methodName: true,
            transactionRef: true,
            rejectionReason: true,
            rejectionReasonEn: true,
            rejectionReasonAm: true,
            createdAt: true,
          },
        },
        updates: {
          where: { informed: true },
          orderBy: { createdAt: 'desc' },
          select: { status: true, message: true, messageEn: true, messageAm: true, trackingCode: true, createdAt: true },
        },
      },
    })
    if (!order) return NextResponse.json({ error: 'We could not find an order with this number.' }, { status: 404 })
    // legacy rejected rows have no translations yet — backfill once and persist
    if (order.rejectionReason && !order.rejectionReasonEn && !order.rejectionReasonAm) {
      try {
        const tr = await translateRejection(order.rejectionReason)
        if (tr) {
          const fields = { rejectionReasonEn: tr.en, rejectionReasonAm: tr.am }
          await db.order.update({ where: { id: order.id }, data: fields })
          await db.payment.updateMany({ where: { orderId: order.id }, data: fields })
          order.rejectionReasonEn = tr.en
          order.rejectionReasonAm = tr.am
          if (order.payment) {
            order.payment.rejectionReasonEn = tr.en
            order.payment.rejectionReasonAm = tr.am
          }
        }
      } catch (e) {
        console.error('reason translation backfill failed', e)
      }
    }
    // normalize phone digits for comparison (user may enter with/without +251/0 prefix)
    const digits = (s: string) => s.replace(/\D/g, '')
    const ok =
      digits(order.phone) === digits(phone) ||
      digits(order.phone).endsWith(digits(phone).slice(-9))
    if (!ok) {
      return NextResponse.json({ error: 'This phone number does not match the order.' }, { status: 403 })
    }
    return NextResponse.json({ order })
  } catch (e) {
    console.error('track error', e)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
