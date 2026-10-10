import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ORDER_STATUSES } from '@/lib/shared'
import { translateRejection } from '@/lib/translate-rejection'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: true,
      user: { select: { name: true, phone: true, email: true } },
      deliveryZone: { select: { name: true, fee: true } },
      updates: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({ order })
}

const schema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  adminNotes: z.string().max(2000).optional().or(z.literal('')),
  estimatedDelivery: z.string().max(120).optional().or(z.literal('')),
  rejectionReason: z.string().max(500).optional().or(z.literal('')),
  // fulfillment step extras
  note: z.string().max(500).optional().or(z.literal('')),
  trackingCode: z.string().max(80).optional().or(z.literal('')),
  informCustomer: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const d = parsed.data

  const order = await db.order.findUnique({ where: { id }, include: { items: true, payment: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (d.adminNotes !== undefined) data.adminNotes = d.adminNotes || null
  if (d.estimatedDelivery !== undefined) data.estimatedDelivery = d.estimatedDelivery || null
  if (d.status) {
    if (d.status === 'CANCELLED' && order.status !== 'CANCELLED') {
      // restock items when cancelling
      await db.$transaction(async (tx) => {
        for (const item of order.items) {
          if (item.productId) {
            await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } }).catch(() => {})
          }
        }
      })
    }
    data.status = d.status
    if (d.status === 'PAYMENT_VERIFIED' && order.paymentStatus === 'PENDING') {
      data.paymentStatus = 'VERIFIED'
    }
  }

  const updated = await db.order.update({ where: { id }, data })

  if (d.status && d.status !== order.status) {
    const inform = d.informCustomer !== false // default: inform the orderer
    const note = d.note?.trim() || null
    const trackingCode = d.trackingCode?.trim() || null

    // customer-visible fulfillment timeline row (also covers guest orders)
    let messageEn: string | null = null
    let messageAm: string | null = null
    if (note) {
      try {
        const tr = await translateRejection(note)
        messageEn = tr?.en ?? null
        messageAm = tr?.am ?? null
      } catch { /* translation is best-effort — original note still shown */ }
    }
    await db.orderUpdate.create({
      data: {
        orderId: id,
        status: d.status,
        message: note,
        messageEn,
        messageAm,
        trackingCode,
        informed: inform,
      },
    })

    await db.auditLog.create({
      data: { adminId: admin.id, adminName: admin.name, action: 'ORDER_STATUS_CHANGED', details: `${order.orderNumber}: ${order.status} → ${d.status}${trackingCode ? ` · trk ${trackingCode}` : ''}${inform ? ' · customer informed' : ' · silent'}` },
    })
    if (inform && order.userId) {
      await db.notification.create({
        data: {
          audience: 'CUSTOMER',
          userId: order.userId,
          title: 'Order update',
          body: `Your order ${order.orderNumber} is now: ${d.status.replaceAll('_', ' ').toLowerCase()}.${note ? ` ${messageEn ?? note}` : ''}${trackingCode ? ` Tracking: ${trackingCode}.` : ''}`,
          link: `/track?orderNumber=${order.orderNumber}`,
        },
      })
    }
  }
  if (d.rejectionReason !== undefined && d.rejectionReason) {
    // auto-translate the reason so EN and AM customers each read it in their language
    const tr = await translateRejection(d.rejectionReason)
    const reasonFields = { rejectionReason: d.rejectionReason, rejectionReasonEn: tr?.en ?? null, rejectionReasonAm: tr?.am ?? null }
    await db.order.update({ where: { id }, data: { paymentStatus: 'REJECTED', ...reasonFields } })
    // mirror onto the payment row so the payment page shows the same reason
    await db.payment.updateMany({ where: { orderId: id }, data: reasonFields })
    await db.auditLog.create({
      data: { adminId: admin.id, adminName: admin.name, action: 'PAYMENT_REJECTED', details: `${order.orderNumber}: ${d.rejectionReason}` },
    })
    if (order.userId) {
      await db.notification.create({
        data: {
          audience: 'CUSTOMER',
          userId: order.userId,
          title: 'Payment rejected',
          body: `Payment for ${order.orderNumber} was rejected: ${d.rejectionReason}`,
          link: `/track?orderNumber=${order.orderNumber}`,
        },
      })
    }
  }
  return NextResponse.json({ order: updated })
}
