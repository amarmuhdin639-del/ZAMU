import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1).max(20),
        size: z.string().min(1).max(10),
        color: z.string().min(1).max(40),
      })
    )
    .min(1)
    .max(30),
  customerName: z.string().min(2).max(80),
  phone: z.string().min(7).max(20).regex(/^[0-9+\s-]+$/, 'Invalid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().min(2).max(80),
  address: z.string().min(5).max(300),
  notes: z.string().max(500).optional().or(z.literal('')),
  telegram: z.string().max(60).optional().or(z.literal('')),
  whatsapp: z.string().max(60).optional().or(z.literal('')),
  deliveryZoneId: z.string().min(1),
  discountCode: z.string().max(40).optional().or(z.literal('')),
})

function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  const digits = Math.floor(10000 + Math.random() * 90000)
  return `ORD-${year}-${digits}`
}

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid order data' }, { status: 400 })
    }
    const data = parsed.data
    const user = await getSessionUser()

    // ---- fetch products & validate ----
    const productIds = data.items.map((i) => i.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds }, active: true },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    for (const item of data.items) {
      const p = productMap.get(item.productId)
      if (!p) return NextResponse.json({ error: 'One of the products is no longer available' }, { status: 400 })
      if (p.stock <= 0) return NextResponse.json({ error: `${p.name} is sold out` }, { status: 409 })
      if (item.qty > p.stock) return NextResponse.json({ error: `Only ${p.stock} left of ${p.name}` }, { status: 409 })
      // requested size/color must exist on the product
      const sizes = p.sizes.split(',').map((s) => s.trim())
      if (!sizes.includes(item.size)) return NextResponse.json({ error: `Size ${item.size} not available for ${p.name}` }, { status: 400 })
    }

    // ---- server-side price calculation (never trust the browser) ----
    let subtotal = 0
    const orderItems = data.items.map((item) => {
      const p = productMap.get(item.productId)!
      const unit = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price
      subtotal += unit * item.qty
      return {
        productId: p.id,
        name: p.name,
        image: p.images.length ? p.images[0].url : null,
        price: unit,
        qty: item.qty,
        size: item.size,
        color: item.color,
      }
    })

    // ---- delivery fee from DB zone ----
    const zone = await db.deliveryZone.findFirst({ where: { id: data.deliveryZoneId, active: true } })
    if (!zone) return NextResponse.json({ error: 'Please choose a valid delivery zone' }, { status: 400 })
    const deliveryFee = zone.fee

    // ---- discount code ----
    let discount = 0
    let usedCode: string | null = null
    if (data.discountCode) {
      const code = await db.discountCode.findUnique({ where: { code: data.discountCode.trim().toUpperCase() } })
      const now = new Date()
      const valid =
        code &&
        code.active &&
        subtotal >= code.minOrder &&
        (!code.startsAt || code.startsAt <= now) &&
        (!code.endsAt || code.endsAt >= now) &&
        (code.usageLimit === null || code.usedCount < code.usageLimit)
      if (!valid) return NextResponse.json({ error: 'Discount code is not valid for this order' }, { status: 400 })
      discount = code.type === 'PERCENT' ? Math.round(subtotal * (code.value / 100) * 100) / 100 : code.value
      discount = Math.min(discount, subtotal)
      usedCode = code.code
      await db.discountCode.update({ where: { id: code.id }, data: { usedCount: { increment: 1 } } })
    }

    const total = Math.max(0, subtotal + deliveryFee - discount)

    // ---- create order + items + decrement stock in a transaction ----
    const order = await db.$transaction(async (tx) => {
      // re-check stock inside transaction to prevent overselling
      for (const item of data.items) {
        const p = await tx.product.findUnique({ where: { id: item.productId } })
        if (!p || p.stock < item.qty) {
          throw new Error(`INSUFFICIENT_STOCK:${p?.name ?? 'Product'}`)
        }
      }
      let orderNumber = generateOrderNumber()
      // guarantee uniqueness
      for (let i = 0; i < 5; i++) {
        const exists = await tx.order.findUnique({ where: { orderNumber } })
        if (!exists) break
        orderNumber = generateOrderNumber()
      }
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: user?.id ?? null,
          customerName: data.customerName,
          phone: data.phone,
          email: data.email || null,
          city: data.city,
          address: data.address,
          notes: data.notes || null,
          telegram: data.telegram || null,
          whatsapp: data.whatsapp || null,
          subtotal,
          deliveryFee,
          discount,
          total,
          discountCode: usedCode,
          deliveryZoneId: zone.id,
          status: 'PAYMENT_PENDING',
          paymentStatus: 'PENDING',
          items: { create: orderItems },
        },
      })
      for (const item of data.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.qty } } })
      }
      return created
    })

    // ---- notifications (in-app; email/SMS hooks can be added later) ----
    await db.notification.create({
      data: {
        audience: 'ADMIN',
        title: 'New order received',
        body: `${order.orderNumber} — ${order.customerName} · ${data.items.length} item(s) · awaiting payment`,
        link: `/admin/orders/${order.id}`,
      },
    })

    return NextResponse.json({ orderNumber: order.orderNumber, total: order.total })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.startsWith('INSUFFICIENT_STOCK')) {
      return NextResponse.json({ error: `${msg.split(':')[1]} just went out of stock. Please review your cart.` }, { status: 409 })
    }
    console.error('order create error', e)
    return NextResponse.json({ error: 'Could not place the order. Please try again.' }, { status: 500 })
  }
}
