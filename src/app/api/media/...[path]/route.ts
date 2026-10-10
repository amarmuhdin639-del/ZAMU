import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

// Serves uploaded media from the DATABASE (MediaAsset.data) so photos and
// videos survive restarts / restores / instance changes. Falls back to the
// legacy disk copy under public/uploads/<path> and backfills the DB when a
// file only exists on disk. Replaces static /uploads/* serving for new files.

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params
  const rel = parts.join('/')

  // 1) authoritative copy: the database
  try {
    const asset = await db.mediaAsset.findUnique({ where: { path: rel } })
    if (asset) {
      const bytes = Buffer.from(asset.data)
      return new Response(new Uint8Array(bytes), {
        headers: {
          'Content-Type': asset.mime,
          'Content-Length': String(bytes.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }
  } catch (e) {
    console.error('media db lookup failed', e)
  }

  // 2) legacy disk copy under public/uploads/<rel>
  const diskPath = path.join(process.cwd(), 'public', 'uploads', rel)
  try {
    if (fs.existsSync(diskPath)) {
      const stat = fs.statSync(diskPath)
      const stream = Readable.toWeb(fs.createReadStream(diskPath)) as ReadableStream
      // backfill the DB so this file becomes durable too (best-effort, off the critical path)
      void db.mediaAsset
        .upsert({
          where: { path: rel },
          update: {},
          create: {
            path: rel,
            data: new Uint8Array(fs.readFileSync(diskPath)),
            mime: guessMime(rel),
            size: stat.size,
          },
        })
        .catch(() => {})
      return new Response(stream, {
        headers: {
          'Content-Type': guessMime(rel),
          'Content-Length': String(stat.size),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }
  } catch (e) {
    console.error('media disk fallback failed', e)
  }

  return NextResponse.json({ error: 'Media not found' }, { status: 404 })
}

function guessMime(rel: string): string {
  const ext = rel.slice(rel.lastIndexOf('.') + 1).toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
  }
  return map[ext] ?? 'application/octet-stream'
}
