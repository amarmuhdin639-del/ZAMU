import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().min(1).max(1000000),
  minOrder: z.number().min(0).max(1000000).optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  usageLimit: z.number().int().min(1).max(100000).nullable().optional(),
  active: z.boolean().optional(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const discounts = await db.discountCode.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ discounts })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const d = parsed.data
  const code = await db.discountCode.create({
    data: {
      code: d.code.toUpperCase(),
      type: d.type,
      value: d.value,
      minOrder: d.minOrder ?? 0,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      endsAt: d.endsAt ? new Date(d.endsAt) : null,
      usageLimit: d.usageLimit ?? null,
      active: d.active ?? true,
    },
  })
  return NextResponse.json({ discount: code })
}
