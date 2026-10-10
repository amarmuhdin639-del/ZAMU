import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      payment: { select: { status: true, methodName: true, transactionRef: true, rejectionReason: true, rejectionReasonEn: true, rejectionReasonAm: true } },
    },
  })
  return NextResponse.json({ orders })
}
