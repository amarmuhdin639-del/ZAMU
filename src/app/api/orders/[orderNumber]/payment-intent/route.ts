import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'payments')

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

function detectMagic(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp'
  return null
}

const schema = z.object({
  methodName: z.string().min(1).max(60),
  transactionRef: z.string().min(3).max(80),
  payerName: z.string().min(2).max(80),
  amount: z.number().positive().max(1000000),
})

export async function POST(req: NextRequest, ctx: { params: Promise<{ orderNumber: string }> }) {
  try {
    const { orderNumber } = await ctx.params
    const order = await db.order.findUnique({ where: { orderNumber }, include: { payment: true } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.payment && order.payment.status === 'VERIFIED') {
      return NextResponse.json({ error: 'This order is already paid and verified.' }, { status: 409 })
    }
    if (order.payment && order.payment.status === 'PENDING') {
      return NextResponse.json(
        { error: 'Your payment is already submitted and waiting for verification.' },
        { status: 409 }
      )
    }

    const form = await req.formData()
    const screenshot = form.get('screenshot')
    const fields = schema.safeParse({
      methodName: form.get('methodName'),
      transactionRef: form.get('transactionRef'),
      payerName: form.get('payerName'),
      amount: Number(form.get('amount')),
    })
    if (!fields.success) {
      return NextResponse.json({ error: fields.error.issues[0]?.message ?? 'Invalid payment details' }, { status: 400 })
    }
    if (!(screenshot instanceof File) || screenshot.size === 0) {
      return NextResponse.json({ error: 'Payment screenshot is required' }, { status: 400 })
    }
    if (screenshot.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Screenshot is too large (max 5MB)' }, { status: 413 })
    }
    const buffer = Buffer.from(await screenshot.arrayBuffer())
    const magic = detectMagic(buffer)
    // magic bytes are the source of truth; if a MIME type is declared it must match
    if (!magic || (screenshot.type && screenshot.type !== magic)) {
      return NextResponse.json({ error: 'Screenshot must be a real JPG, PNG or WEBP image' }, { status: 415 })
    }

    // store OUTSIDE public/ — never publicly accessible via predictable URL
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    const filename = `${orderNumber}-${crypto.randomBytes(8).toString('hex')}${ALLOWED_MIME[magic]}`
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer)
    // Durable copy inside the database (survives restarts / restores / wipes).
    try {
      await db.mediaAsset.upsert({
        where: { path: `payments/${filename}` },
        update: { data: buffer, mime: magic!, size: buffer.length },
        create: { path: `payments/${filename}`, data: buffer, mime: magic!, size: buffer.length },
      })
    } catch (e) {
      console.error('payment screenshot db write failed', e)
    }

    const payment = await db.$transaction(async (tx) => {
      if (order.payment) {
        // previous submission was rejected — replace it
        await tx.payment.delete({ where: { id: order.payment.id } })
      }
      return tx.payment.create({
        data: {
          orderId: order.id,
          methodName: fields.data.methodName,
          transactionRef: fields.data.transactionRef,
          payerName: fields.data.payerName,
          amount: fields.data.amount,
          screenshotPath: filename,
          status: 'PENDING',
        },
      })
    })

    await db.notification.create({
      data: {
        audience: 'ADMIN',
        title: 'Payment confirmation requires verification',
        body: `${order.orderNumber} — ${fields.data.methodName} · ${fields.data.amount} ETB · from ${fields.data.payerName}`,
        link: `/admin/payments`,
      },
    })
    if (order.userId) {
      await db.notification.create({
        data: {
          audience: 'CUSTOMER',
          userId: order.userId,
          title: 'Payment submitted',
          body: `We received your payment confirmation for ${order.orderNumber}. Our team will verify it shortly.`,
          link: `/track?orderNumber=${order.orderNumber}`,
        },
      })
    }

    return NextResponse.json({ ok: true, paymentId: payment.id })
  } catch (e) {
    console.error('payment upload error', e)
    return NextResponse.json({ error: 'Could not submit payment. Please try again.' }, { status: 500 })
  }
}
