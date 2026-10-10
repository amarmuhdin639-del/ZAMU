import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createSession, hashPassword } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(7).max(20).regex(/^[0-9+\s-]+$/, 'Invalid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8).max(100),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const { name, phone, email, password } = parsed.data
    const existing = await db.user.findFirst({
      where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
    })
    if (existing) {
      return NextResponse.json({ error: 'An account with this phone or email already exists' }, { status: 409 })
    }
    const user = await db.user.create({
      data: { name, phone, email: email || null, passwordHash: hashPassword(password), role: 'CUSTOMER' },
    })
    await createSession(user.id)
    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } })
  } catch (e) {
    console.error('register error', e)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
