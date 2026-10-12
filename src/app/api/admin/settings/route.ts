import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { SETTING_DEFAULTS } from '@/lib/queries'

const schema = z.record(z.string(), z.string().max(5000))

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const rows = await db.storeSetting.findMany()
  const settings: Record<string, string> = { ...SETTING_DEFAULTS }
  for (const r of rows) settings[r.key] = r.value
  return NextResponse.json({ settings })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const entries = Object.entries(parsed.data)
  for (const [key, value] of entries) {
    await db.storeSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
  }
  await db.auditLog.create({
    data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Updated store settings: ${entries.map(([k]) => k).join(', ').slice(0, 200)}` },
  })
  return NextResponse.json({ ok: true })
}
