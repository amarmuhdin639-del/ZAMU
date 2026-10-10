import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  image: z.string().max(300).nullable().optional(),
  name: z.string().min(1).max(60).optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const data: { image?: string | null; name?: string } = {}
  if (parsed.data.image !== undefined) data.image = parsed.data.image
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim()
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const category = await db.category.update({ where: { id }, data })
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      adminName: admin.name,
      action: 'CATEGORY_UPDATED',
      details: `${category.name}: ${parsed.data.image !== undefined ? 'image updated' : 'renamed'}`,
    },
  })
  return NextResponse.json({ category })
}
