import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(1).max(60),
  accountNumber: z.string().min(1).max(80),
  accountName: z.string().min(1).max(80),
  phone: z.string().max(40).optional().or(z.literal('')),
  instructions: z.string().max(1000).optional().or(z.literal('')),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const methods = await db.paymentMethod.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ methods })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const method = await db.paymentMethod.create({ data: { ...parsed.data, phone: parsed.data.phone || null, instructions: parsed.data.instructions || null } })
  await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Added payment method ${parsed.data.name}` } })
  return NextResponse.json({ method })
}
