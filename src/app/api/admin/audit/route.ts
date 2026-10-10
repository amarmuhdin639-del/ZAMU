import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  return NextResponse.json({ logs })
}
