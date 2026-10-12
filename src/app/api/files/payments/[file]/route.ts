import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

// Serves customer payment screenshots for the ADMIN payment queue/order detail.
// Source of truth is the database (MediaAsset, path "payments/<file>"); falls
// back to the private on-disk copy under uploads/payments/ and backfills the DB.
// Payment proof is sensitive: admin session required, never cached publicly.

export async function GET(_req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { file } = await ctx.params
  if (!/^[A-Za-z0-9._-]+$/.test(file)) {
    return NextResponse.json({ error: 'Bad filename' }, { status: 400 })
  }

  // 1) authoritative copy: the database
  try {
    const asset = await db.mediaAsset.findUnique({ where: { path: `payments/${file}` } })
    if (asset) {
      const bytes = Buffer.from(asset.data)
      return new Response(new Uint8Array(bytes), {
        headers: {
          'Content-Type': asset.mime,
          'Content-Length': String(bytes.length),
          'Cache-Control': 'private, no-store',
        },
      })
    }
  } catch (e) {
    console.error('payment file db lookup failed', e)
  }

  // 2) legacy private disk copy under uploads/payments/<file>
  const diskPath = path.join(process.cwd(), 'uploads', 'payments', file)
  try {
    if (fs.existsSync(diskPath)) {
      const stream = Readable.toWeb(fs.createReadStream(diskPath)) as ReadableStream
      // backfill into the DB so it becomes durable (best-effort)
      void db.mediaAsset
        .upsert({
          where: { path: `payments/${file}` },
          update: {},
          create: {
            path: `payments/${file}`,
            data: new Uint8Array(fs.readFileSync(diskPath)),
            mime: guessMime(file),
            size: fs.statSync(diskPath).size,
          },
        })
        .catch(() => {})
      return new Response(stream, {
        headers: {
          'Content-Type': guessMime(file),
          'Cache-Control': 'private, no-store',
        },
      })
    }
  } catch (e) {
    console.error('payment file disk fallback failed', e)
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

function guessMime(file: string): string {
  const ext = file.slice(file.lastIndexOf('.') + 1).toLowerCase()
  const map: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  return map[ext] ?? 'application/octet-stream'
}
