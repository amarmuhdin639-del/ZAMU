import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { translateRejection } from '@/lib/translate-rejection'

const schema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const payment = await db.payment.findUnique({ where: { id }, include: { order: true } })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  if (parsed.data.action === 'APPROVE') {
    await db.$transaction([
      db.payment.update({
        where: { id },
        data: { status: 'VERIFIED', reviewedBy: admin.name, reviewedAt: new Date(), rejectionReason: null },
      }),
      db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'VERIFIED', status: 'PAYMENT_VERIFIED', rejectionReason: null } }),
      // start the customer-visible fulfillment timeline
      db.orderUpdate.create({
        data: { orderId: payment.orderId, status: 'PAYMENT_VERIFIED', informed: true },
      }),
    ])
    await db.auditLog.create({
      data: { adminId: admin.id, adminName: admin.name, action: 'PAYMENT_APPROVED', details: `${payment.order.orderNumber} · ${payment.methodName} · ${payment.amount} ETB` },
    })
    if (payment.order.userId) {
      await db.notification.create({
        data: {
          audience: 'CUSTOMER',
          userId: payment.order.userId,
          title: 'Your payment has been verified',
          body: `Payment for ${payment.order.orderNumber} was verified. Your order is moving forward!`,
          link: `/track?orderNumber=${payment.order.orderNumber}`,
        },
      })
    }
  } else {
    const reason = parsed.data.reason?.trim()
    if (!reason) return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
    // auto-translate the reason so EN and AM customers each read it in their language
    const tr = await translateRejection(reason)
    const reasonFields = { rejectionReason: reason, rejectionReasonEn: tr?.en ?? null, rejectionReasonAm: tr?.am ?? null }
    await db.$transaction([
      db.payment.update({
        where: { id },
        data: { status: 'REJECTED', reviewedBy: admin.name, reviewedAt: new Date(), ...reasonFields },
      }),
      db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'REJECTED', ...reasonFields } }),
    ])
    await db.auditLog.create({
      data: { adminId: admin.id, adminName: admin.name, action: 'PAYMENT_REJECTED', details: `${payment.order.orderNumber}: ${reason}` },
    })
    if (payment.order.userId) {
      await db.notification.create({
        data: {
          audience: 'CUSTOMER',
          userId: payment.order.userId,
          title: 'Payment rejected',
          body: `Payment for ${payment.order.orderNumber} was rejected: ${reason}`,
          link: `/track?orderNumber=${payment.order.orderNumber}`,
        },
      })
    }
  }
  return NextResponse.json({ ok: true })
}
