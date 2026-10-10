import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  active: z.boolean().optional(),
  code: z.string().min(2).max(40).optional(),
  type: z.enum(['PERCENT', 'FIXED']).optional(),
  value: z.number().min(1).max(1000000).optional(),
  minOrder: z.number().min(0).max(1000000).optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  usageLimit: z.number().int().min(1).max(100000).nullable().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const d = { ...parsed.data }
  const data: Record<string, unknown> = { ...d }
  delete (data as { startsAt?: unknown }).startsAt
  if (d.startsAt !== undefined) data.startsAt = d.startsAt ? new Date(d.startsAt) : null
  delete (data as { endsAt?: unknown }).endsAt
  if (d.endsAt !== undefined) data.endsAt = d.endsAt ? new Date(d.endsAt) : null
  const discount = await db.discountCode.update({ where: { id }, data })
  return NextResponse.json({ discount })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  await db.discountCode.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
