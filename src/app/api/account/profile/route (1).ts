import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().max(80).optional().or(z.literal('')),
  address: z.string().max(300).optional().or(z.literal('')),
  telegram: z.string().max(60).optional().or(z.literal('')),
  whatsapp: z.string().max(60).optional().or(z.literal('')),
  password: z.string().min(8).max(100).optional(),
})

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { password, ...rest } = parsed.data
  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) data[k] = v === '' ? null : v
  }
  if (password) data.passwordHash = (await import('@/lib/auth')).hashPassword(password)
  await db.user.update({ where: { id: user.id }, data })
  return NextResponse.json({ ok: true })
}
