import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  fee: z.number().min(0).max(100000).optional(),
  estimatedDays: z.string().max(80).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const zone = await db.deliveryZone.update({ where: { id }, data: parsed.data })
  await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Updated delivery zone ${zone.name} (fee ${zone.fee})` } })
  return NextResponse.json({ zone })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const z1 = await db.deliveryZone.delete({ where: { id } }).catch(() => null)
  if (z1) {
    await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Deleted delivery zone ${z1.name}` } })
  }
  return NextResponse.json({ ok: true })
}
