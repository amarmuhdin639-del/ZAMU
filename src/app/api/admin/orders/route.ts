import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const paymentStatus = sp.get('paymentStatus')
  const q = sp.get('q')
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(q ? { OR: [{ orderNumber: { contains: q.toUpperCase() } }, { customerName: { contains: q } }, { phone: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      payment: { select: { id: true, status: true, methodName: true, transactionRef: true, screenshotPath: true } },
      user: { select: { name: true, phone: true } },
    },
    take: 200,
  })
  return NextResponse.json({ orders })
}
