import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(1).max(80),
  fee: z.number().min(0).max(100000),
  estimatedDays: z.string().max(80).optional().or(z.literal('')),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const zones = await db.deliveryZone.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ zones })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const zone = await db.deliveryZone.create({ data: { ...parsed.data, estimatedDays: parsed.data.estimatedDays || null } })
  await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Added delivery zone ${parsed.data.name} (fee ${parsed.data.fee})` } })
  return NextResponse.json({ zone })
}
