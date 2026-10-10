import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createSession, verifyPassword } from '@/lib/auth'

const schema = z.object({
  identifier: z.string().min(3), // phone or email
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    const { identifier, password } = parsed.data
    const id = identifier.trim().toLowerCase()
    const user = await db.user.findFirst({
      where: { OR: [{ email: id }, { phone: identifier.trim() }] },
    })
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Wrong phone/email or password' }, { status: 401 })
    }
    await createSession(user.id)
    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } })
  } catch (e) {
    console.error('login error', e)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
