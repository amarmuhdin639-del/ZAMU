import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  accountNumber: z.string().min(1).max(80).optional(),
  accountName: z.string().min(1).max(80).optional(),
  phone: z.string().max(40).nullable().optional(),
  instructions: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const method = await db.paymentMethod.update({ where: { id }, data: parsed.data })
  await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Updated payment method ${method.name}` } })
  return NextResponse.json({ method })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const m = await db.paymentMethod.delete({ where: { id } }).catch(() => null)
  if (m) {
    await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Deleted payment method ${m.name}` } })
  }
  return NextResponse.json({ ok: true })
}
