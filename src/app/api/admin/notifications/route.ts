import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const notifications = await db.notification.findMany({
    where: { audience: 'ADMIN' },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  const unread = notifications.filter((n) => !n.read).length
  return NextResponse.json({ notifications, unread })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  if (body?.id) {
    await db.notification.update({ where: { id: String(body.id) }, data: { read: true } }).catch(() => {})
  } else {
    await db.notification.updateMany({ where: { audience: 'ADMIN', read: false }, data: { read: true } })
  }
  return NextResponse.json({ ok: true })
}
