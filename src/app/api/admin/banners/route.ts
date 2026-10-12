import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional().or(z.literal('')),
  image: z.string().max(300).optional().or(z.literal('')),
  link: z.string().max(200).optional().or(z.literal('')),
  type: z.enum(['PROMO', 'NEW_DROP', 'FLASH']).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const banners = await db.banner.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ banners })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const banner = await db.banner.create({ data: { ...parsed.data, subtitle: parsed.data.subtitle || null, image: parsed.data.image || null, link: parsed.data.link || null } })
  return NextResponse.json({ banner })
}
