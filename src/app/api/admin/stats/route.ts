import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [totalOrders, pendingPayments, verifiedPayments, todayOrders, products, lowStock, outOfStock, allVerifiedOrders, recentOrders, revenueAgg] =
    await Promise.all([
      db.order.count(),
      db.payment.count({ where: { status: 'PENDING' } }),
      db.payment.count({ where: { status: 'VERIFIED' } }),
      db.order.count({ where: { createdAt: { gte: startOfToday } } }),
      db.product.count(),
      db.product.count({ where: { stock: { gt: 0, lte: 3 }, active: true } }),
      db.product.count({ where: { stock: 0, active: true } }),
      db.order.findMany({
        where: { paymentStatus: 'VERIFIED', status: { not: 'CANCELLED' } },
        select: { total: true, createdAt: true },
      }),
      db.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true, orderNumber: true, customerName: true, total: true, status: true, paymentStatus: true, createdAt: true,
          items: { select: { name: true, qty: true } },
        },
      }),
      // revenue for last 14 days chart (verified payments only)
      db.order.groupBy({
        by: ['paymentStatus'],
        _sum: { total: true },
        where: { paymentStatus: 'VERIFIED', status: { not: 'CANCELLED' } },
      }),
    ])

  // daily revenue last 14 days
  const days: { date: string; revenue: number; orders: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() - i)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const dayOrders = allVerifiedOrders.filter((o) => o.createdAt >= d && o.createdAt < next)
    days.push({
      date: d.toISOString().slice(0, 10),
      revenue: dayOrders.reduce((n, o) => n + o.total, 0),
      orders: dayOrders.length,
    })
  }

  const totalRevenue = revenueAgg.reduce((n, g) => n + (g._sum.total ?? 0), 0)

  const statusCounts = await db.order.groupBy({ by: ['status'], _count: { status: true } })

  return NextResponse.json({
    totalOrders,
    pendingPayments,
    verifiedPayments,
    todayOrders,
    products,
    lowStock,
    outOfStock,
    totalRevenue,
    recentOrders,
    revenueChart: days,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count.status })),
  })
}
