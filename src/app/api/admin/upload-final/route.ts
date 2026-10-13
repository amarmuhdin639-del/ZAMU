import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { persistData } from '@/lib/persist'
import crypto from 'crypto'

// Chunked upload, part 2 of 2: stitch the slices back together, validate the
// result (magic bytes + size caps), store it as a normal MediaAsset, delete
// the chunk rows and snapshot the DB like the single-shot route does.

const MAX_IMAGE = 10 * 1024 * 1024
const MAX_VIDEO = 80 * 1024 * 1024

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
}

function detectMagic(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp'
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    if (b[8] === 0x71 && b[9] === 0x74 && b[10] === 0x20 && b[11] === 0x20) return 'video/quicktime'
    return 'video/mp4'
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm'
  return null
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const chunkId = String(body.chunkId ?? '').replace(/[^a-z0-9]/gi, '')
    const declaredSize = Number(body.size ?? 0)
    const target = body.target === 'site' ? 'site' : body.target === 'categories' ? 'categories' : 'products'

    if (!/^[a-z0-9]{8,64}$/i.test(chunkId)) {
      return NextResponse.json({ error: 'Bad upload reference' }, { status: 400 })
    }

    const rows = await db.mediaAsset.findMany({
      where: { path: { startsWith: `__chunks/${chunkId}/` } },
      orderBy: { path: 'asc' },
    })
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Upload expired — please start again' }, { status: 410 })
    }

    const parts: Buffer[] = []
    let sum = 0
    for (const row of rows) {
      parts.push(Buffer.from(row.data))
      sum += row.size
    }
    const buffer = Buffer.concat(parts)

    // The client reports the full file size; a mismatch means a slice was lost.
    const cleanup = () =>
      db.mediaAsset.deleteMany({ where: { path: { startsWith: `__chunks/${chunkId}/` } } }).catch(() => {})

    if (declaredSize > 0 && Math.abs(declaredSize - sum) > 1024) {
      await cleanup()
      return NextResponse.json({ error: 'Upload incomplete — please retry' }, { status: 409 })
    }

    const magic = detectMagic(buffer)
    const ext = magic ? EXT[magic] : null
    if (!magic || !ext) {
      await cleanup()
      return NextResponse.json(
        { error: 'Only real JPG, PNG, WEBP, MP4, MOV or WEBM files are allowed' },
        { status: 415 }
      )
    }
    const isVideo = magic.startsWith('video/')
    if (buffer.length > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
      await cleanup()
      return NextResponse.json(
        { error: isVideo ? 'Video is too large (max 80MB)' : 'Image is too large (max 10MB)' },
        { status: 413 }
      )
    }

    const rel = `${target}/${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`
    await db.mediaAsset.create({
      data: { path: rel, data: new Uint8Array(buffer), mime: magic, size: buffer.length },
    })
    await cleanup()
    persistData()

    return NextResponse.json({ url: `/api/media/${rel}`, type: isVideo ? 'video' : 'image' })
  } catch (e) {
    console.error('upload finalize error', e)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
