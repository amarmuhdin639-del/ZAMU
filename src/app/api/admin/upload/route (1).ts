import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { persistData } from '@/lib/persist'
import { db } from '@/lib/db'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Admin media uploads (product photos/videos + site/category media).
// Durable by design: the bytes are stored in the MediaAsset table (the same
// git-committed sqlite that carries orders) and served via /api/media/*, so
// they survive restarts, sandbox restores and fresh deployments. A best-effort
// disk copy under public/uploads/<folder>/ is kept for the legacy backfill path.

const IMAGE_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const VIDEO_MIME: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
}

const MAX_IMAGE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO = 80 * 1024 * 1024 // 80MB — generous for phone-shot product clips

function detectMagic(b: Uint8Array): string | null {
  // JPEG / PNG / WEBP
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp'
  // ISO BMFF container — MP4 (isom/mp42/…) or MOV (qt)
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    if (b[8] === 0x71 && b[9] === 0x74 && b[10] === 0x20 && b[11] === 0x20) return 'video/quicktime'
    return 'video/mp4'
  }
  // Matroska/WEBM (EBML)
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm'
  return null
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const form = await req.formData()
    const file = form.get('file')
    const target = form.get('target')
    const folder = target === 'site' ? 'site' : target === 'categories' ? 'categories' : 'products'

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const magic = detectMagic(buffer)
    const isImage = !!magic && magic in IMAGE_MIME
    const isVideo = !!magic && magic in VIDEO_MIME

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Only real JPG, PNG, WEBP, MP4, MOV or WEBM files are allowed' },
        { status: 415 }
      )
    }
    if (isImage && file.size > MAX_IMAGE) {
      return NextResponse.json({ error: 'Image is too large (max 10MB)' }, { status: 413 })
    }
    if (isVideo && file.size > MAX_VIDEO) {
      return NextResponse.json({ error: 'Video is too large (max 80MB)' }, { status: 413 })
    }

    const ext = isImage ? IMAGE_MIME[magic!] : VIDEO_MIME[magic!]
    const filename = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`
    const rel = `${folder}/${filename}`

    // 1) authoritative copy: the database (rides the git-committed sqlite)
    await db.mediaAsset.upsert({
      where: { path: rel },
      update: { data: new Uint8Array(buffer), mime: magic!, size: buffer.length },
      create: { path: rel, data: new Uint8Array(buffer), mime: magic!, size: buffer.length },
    })

    // 2) best-effort disk copy (lets /api/media backfill and keeps tooling simple)
    try {
      const dir = path.join(process.cwd(), 'public', 'uploads', folder)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, filename), buffer)
    } catch (e) {
      console.error('upload disk copy failed (DB copy still good)', e)
    }

    // Snapshot into git right away so a sandbox restore can never lose the upload.
    persistData()

    return NextResponse.json({ url: `/api/media/${rel}`, type: isVideo ? 'video' : 'image' })
  } catch (e) {
    console.error('admin upload error', e)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
