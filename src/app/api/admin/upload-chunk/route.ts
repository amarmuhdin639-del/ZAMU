import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

// Chunked upload, part 1 of 2: receive one slice of a big file. Phone videos
// are 20-100 MB and Netlify functions reject bodies over ~6 MB, so the client
// sends ~4 MB slices; each lands in the MediaAsset table under
// __chunks/<chunkId>/<index> until /api/admin/upload-final stitches them
// together into a normal media asset.

const MAX_CHUNK = 5 * 1024 * 1024

// Magic bytes of the FIRST slice decide whether this is really an image/video.
function detectMagic(b: Uint8Array): string | null {
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
    const chunkId = String(form.get('chunkId') ?? '').replace(/[^a-z0-9]/gi, '')
    const index = parseInt(String(form.get('index') ?? ''), 10)
    const chunk = form.get('chunk')

    if (!/^[a-z0-9]{8,64}$/i.test(chunkId) || !Number.isInteger(index) || index < 0 || index > 999) {
      return NextResponse.json({ error: 'Bad chunk request' }, { status: 400 })
    }
    if (!(chunk instanceof File) || chunk.size === 0) {
      return NextResponse.json({ error: 'No chunk received' }, { status: 400 })
    }
    if (chunk.size > MAX_CHUNK) {
      return NextResponse.json({ error: 'Chunk too large' }, { status: 413 })
    }

    const bytes = new Uint8Array(await chunk.arrayBuffer())
    if (index === 0 && !detectMagic(bytes)) {
      return NextResponse.json(
        { error: 'Only real JPG, PNG, WEBP, MP4, MOV or WEBM files are allowed' },
        { status: 415 }
      )
    }

    const path = `__chunks/${chunkId}/${String(index).padStart(4, '0')}`
    await db.mediaAsset.upsert({
      where: { path },
      update: { data: bytes, size: bytes.length },
      create: { path, data: bytes, mime: 'application/octet-stream', size: bytes.length },
    })
    return NextResponse.json({ ok: true, index })
  } catch (e) {
    console.error('chunk upload error', e)
    return NextResponse.json({ error: 'Chunk upload failed — please retry' }, { status: 500 })
  }
}
