import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Public: active payment methods shown to customers during checkout
export async function GET() {
  const methods = await db.paymentMethod.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, accountNumber: true, accountName: true, phone: true, instructions: true },
  })
  return NextResponse.json({ methods })
}
