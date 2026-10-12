import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// One-time maintenance endpoint: makes sure the MediaAsset table exists in the
// active database (Turso in production). Idempotent — safe to visit any time.
// Admin-only. While logged in as admin, open /api/admin/ensure-media-table.
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const rows = await db.$queryRaw<{ name: string }[]>`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'MediaAsset'`
    if (rows.length > 0) {
      return NextResponse.json({ ok: true, table: 'MediaAsset', status: 'already exists' })
    }
    await db.$executeRaw`
      CREATE TABLE "MediaAsset" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "path" TEXT NOT NULL,
        "mime" TEXT NOT NULL,
        "size" INTEGER NOT NULL,
        "data" BLOB NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    await db.$executeRaw`
      CREATE UNIQUE INDEX "MediaAsset_path_key" ON "MediaAsset"("path")`
    return NextResponse.json({ ok: true, table: 'MediaAsset', status: 'created' })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'setup failed' },
      { status: 500 }
    )
  }
}
