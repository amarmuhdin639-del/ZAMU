import 'server-only'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'tibeb_session'
const SESSION_DAYS = 30

// ---------- password hashing (scrypt, zero-dependency) ----------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)
}

// ---------- sessions ----------

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { token, userId, expiresAt } })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  })
  return token
}

export async function destroySession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } })
    store.delete(SESSION_COOKIE)
  }
}

export type SafeUser = {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
  city: string | null
  address: string | null
  telegram: string | null
  whatsapp: string | null
}

export async function getSessionUser(): Promise<SafeUser | null> {
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (!token) return null
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session) return null
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    const u = session.user
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      city: u.city,
      address: u.address,
      telegram: u.telegram,
      whatsapp: u.whatsapp,
    }
  } catch {
    return null
  }
}

export async function requireAdmin(): Promise<SafeUser | null> {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return null
  return user
}
