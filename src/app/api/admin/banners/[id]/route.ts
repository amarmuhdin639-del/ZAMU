import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  title: z.string().min(1).max(120).optional(),
  subtitle: z.string().max(200).nullable().optional(),
  image: z.string().max(300).nullable().optional(),
  link: z.string().max(200).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const banner = await db.banner.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ banner })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  await db.banner.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
