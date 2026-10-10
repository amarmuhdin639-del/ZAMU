import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = String(body?.code ?? '').trim().toUpperCase()
    const subtotal = Number(body?.subtotal ?? 0)
    if (!code) return NextResponse.json({ error: 'Enter a discount code' }, { status: 400 })
    const dc = await db.discountCode.findUnique({ where: { code } })
    const now = new Date()
    const valid =
      dc &&
      dc.active &&
      subtotal >= dc.minOrder &&
      (!dc.startsAt || dc.startsAt <= now) &&
      (!dc.endsAt || dc.endsAt >= now) &&
      (dc.usageLimit === null || dc.usedCount < dc.usageLimit)
    if (!valid) {
      return NextResponse.json({ error: 'This code is invalid, expired or does not apply to your order' }, { status: 400 })
    }
    const discount =
      dc.type === 'PERCENT' ? Math.round(subtotal * (dc.value / 100) * 100) / 100 : dc.value
    return NextResponse.json({ code: dc.code, type: dc.type, value: dc.value, discount: Math.min(discount, subtotal) })
  } catch (e) {
    console.error('discount validate error', e)
    return NextResponse.json({ error: 'Could not validate code' }, { status: 500 })
  }
}
