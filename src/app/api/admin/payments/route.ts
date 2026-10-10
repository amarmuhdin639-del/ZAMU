import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const status = req.nextUrl.searchParams.get('status') // PENDING | VERIFIED | REJECTED
  const payments = await db.payment.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      order: {
        select: {
          id: true, orderNumber: true, customerName: true, phone: true, total: true, createdAt: true, status: true, paymentStatus: true,
          items: { select: { name: true, qty: true, size: true, color: true } },
        },
      },
    },
    take: 200,
  })
  return NextResponse.json({ payments })
}
